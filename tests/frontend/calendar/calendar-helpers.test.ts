import { Principal } from '@dfinity/principal';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceRole, type CommunityEventPayload } from '../../../frontend/src/backend';
import {
  calendarEventUrl,
  canEditCalendarRole,
  canOwnCalendarRole,
  dateFromUtcNanos,
  defaultEventEnd,
  eventInputFromForm,
  eventInputFromMovedEvent,
  eventToCalendarItem,
  eventWorkspaceVisible,
  formFromEvent,
  optionalText,
  publicEventUrl,
  toDatetimeLocalValue,
  utcNanosFromDate,
} from '../../../frontend/src/calendar/calendarApi';

const owner = Principal.fromText('2vxsx-fae');

function event(overrides: Partial<CommunityEventPayload> = {}): CommunityEventPayload {
  return {
    id: 5n,
    communityId: 9n,
    title: 'Planning hui',
    description: 'Coordinate action',
    location: 'Library',
    startUtc: 1_777_500_000_000_000_000n,
    endUtc: 1_777_503_600_000_000_000n,
    allDay: false,
    owner,
    createdAt: 1n,
    updatedAt: 2n,
    archived: false,
    role: WorkspaceRole.owner,
    communityShare: WorkspaceRole.viewer,
    access: [],
    publicToken: null,
    ...overrides,
  };
}

describe('calendar helpers', () => {
  it('round-trips dates through UTC nanoseconds', () => {
    const date = new Date('2026-05-03T11:22:00.000Z');
    const nanos = utcNanosFromDate(date);

    expect(nanos).toBe(1_777_807_320_000_000_000n);
    expect(dateFromUtcNanos(nanos).toISOString()).toBe(date.toISOString());
    expect(defaultEventEnd(date).toISOString()).toBe('2026-05-03T12:22:00.000Z');
  });

  it('converts optional text and form values into backend event input', () => {
    expect(optionalText('  ')).toBeNull();
    expect(optionalText('  Agenda  ')).toBe('Agenda');

    const input = eventInputFromForm({
      title: '  Weekly standup  ',
      description: '  Purpose  ',
      location: '',
      startLocal: '2026-05-03T11:22',
      endLocal: '2026-05-03T12:22',
      allDay: false,
    });

    expect(input.title).toBe('Weekly standup');
    expect(input.description).toBe('Purpose');
    expect(input.location).toBeNull();
    expect(input.endUtc > input.startUtc).toBe(true);
  });

  it('maps moved events without dropping existing metadata', () => {
    const source = event();
    const moved = eventInputFromMovedEvent(source, {
      start: new Date('2026-05-04T10:00:00.000Z'),
      end: new Date('2026-05-04T11:30:00.000Z'),
      allDay: true,
    });

    expect(moved.title).toBe(source.title);
    expect(moved.description).toBe(source.description);
    expect(moved.location).toBe(source.location);
    expect(moved.allDay).toBe(true);
    expect(dateFromUtcNanos(moved.startUtc).toISOString()).toBe('2026-05-04T10:00:00.000Z');
    expect(dateFromUtcNanos(moved.endUtc).toISOString()).toBe('2026-05-04T11:30:00.000Z');
  });

  it('builds calendar widget items with workspace visibility hints', () => {
    const item = eventToCalendarItem(event());

    expect(item.id).toBe('5');
    expect(item.title).toBe('Planning hui');
    expect(item.backgroundColor).toBe('#111111');
    expect(item.extendedProps.workspaceVisible).toBe(true);
    expect(eventWorkspaceVisible(event({ communityShare: null }))).toBe(false);
  });

  it('derives editable form state and access roles', () => {
    const source = event({ communityShare: WorkspaceRole.editor });
    const form = formFromEvent(source);

    expect(form.title).toBe('Planning hui');
    expect(form.description).toBe('Coordinate action');
    expect(form.location).toBe('Library');
    expect(form.startLocal).toBe(toDatetimeLocalValue(dateFromUtcNanos(source.startUtc)));
    expect(form.workspaceRole).toBe(WorkspaceRole.editor);
    expect(canEditCalendarRole(WorkspaceRole.editor)).toBe(true);
    expect(canEditCalendarRole(WorkspaceRole.viewer)).toBe(false);
    expect(canOwnCalendarRole(WorkspaceRole.owner)).toBe(true);
  });

  it('builds public and authenticated event URLs from route helpers', () => {
    vi.stubGlobal('window', { location: { origin: 'http://127.0.0.1:5175' } });

    expect(publicEventUrl('share-token')).toBe('http://127.0.0.1:5175/calendar/public/share-token');
    expect(calendarEventUrl(7n, 3n)).toBe('http://127.0.0.1:5175/communities/7/workspace/calendar/events/3');

    vi.unstubAllGlobals();
  });
});

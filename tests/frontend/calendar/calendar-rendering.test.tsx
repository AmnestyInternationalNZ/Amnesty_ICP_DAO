import React from 'react';
import { Principal } from '@dfinity/principal';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkspaceRole, type CommunityEventPayload } from '../../../frontend/src/backend';
import { EventCalendarWidget } from '../../../frontend/src/components/calendar/EventCalendarWidget';

const owner = Principal.fromText('2vxsx-fae');

function event(overrides: Partial<CommunityEventPayload> = {}): CommunityEventPayload {
  return {
    id: 1n,
    communityId: 4n,
    title: 'Visible planning event',
    description: 'Read-only render fixture',
    location: 'Online',
    startUtc: 1_777_500_000_000_000_000n,
    endUtc: 1_777_503_600_000_000_000n,
    allDay: false,
    owner,
    createdAt: 1n,
    updatedAt: 2n,
    archived: false,
    role: WorkspaceRole.viewer,
    communityShare: WorkspaceRole.viewer,
    access: [],
    publicToken: null,
    ...overrides,
  };
}

describe('calendar rendering', () => {
  it('renders the UKU event-calendar host for read-only public/viewer mode', () => {
    const html = renderToStaticMarkup(
      <EventCalendarWidget
        canEdit={false}
        events={[event()]}
        focusDate={new Date('2026-05-03T11:22:00.000Z')}
        focusView="timeGridDay"
        onDateClick={() => undefined}
        onEventChange={() => undefined}
        onEventClick={() => undefined}
        onSelectRange={() => undefined}
      />,
    );

    expect(html).toContain('event-calendar-host');
  });

  it('renders the calendar host for editable workspace mode', () => {
    const html = renderToStaticMarkup(
      <EventCalendarWidget
        canEdit
        events={[event({ role: WorkspaceRole.owner })]}
        onDateClick={() => undefined}
        onEventChange={() => undefined}
        onEventClick={() => undefined}
        onSelectRange={() => undefined}
      />,
    );

    expect(html).toContain('event-calendar-host');
  });
});

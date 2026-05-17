import type { CommunityEventInput, CommunityEventPayload } from '../backend';
import { WorkspaceRole } from '../backend';
import { routePaths } from '../routing/appRoutes';

export const NANOS_PER_MILLI = BigInt(1_000_000);
const ONE_HOUR_MS = 60 * 60 * 1000;

export type CalendarDisplayEvent = CommunityEventPayload & {
  temporary?: boolean;
};

export function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function optionalTextValue(value: string | null | undefined): string {
  return value ?? '';
}

export function utcNanosFromDate(date: Date): bigint {
  return BigInt(date.getTime()) * NANOS_PER_MILLI;
}

export function dateFromUtcNanos(value: bigint): Date {
  return new Date(Number(value / NANOS_PER_MILLI));
}

export function defaultEventEnd(start: Date): Date {
  return new Date(start.getTime() + ONE_HOUR_MS);
}

export function toDatetimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDatetimeLocalValue(value: string): Date {
  return new Date(value);
}

export function readableDateTime(value: bigint, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(dateFromUtcNanos(value));
}

export function eventWorkspaceVisible(event: CommunityEventPayload | CalendarDisplayEvent): boolean {
  return event.communityShare !== null;
}

export function eventToCalendarItem(event: CalendarDisplayEvent) {
  const temporary = Boolean(event.temporary);
  return {
    id: event.id.toString(),
    title: event.title,
    start: dateFromUtcNanos(event.startUtc),
    end: dateFromUtcNanos(event.endUtc),
    allDay: event.allDay,
    backgroundColor: temporary ? '#ffec00' : eventWorkspaceVisible(event) ? '#111111' : undefined,
    borderColor: temporary ? '#111111' : undefined,
    className: temporary ? 'calendar-draft-event' : undefined,
    extendedProps: {
      eventId: event.id.toString(),
      role: event.role,
      temporary,
      workspaceVisible: eventWorkspaceVisible(event),
    },
  };
}

function dateFromCalendarValue(value: string | Date | undefined, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.length > 0) return new Date(value);
  return fallback;
}

export function eventInputFromMovedEvent(
  existing: CommunityEventPayload,
  changed: { start?: string | Date; end?: string | Date; allDay?: boolean },
): CommunityEventInput {
  const existingStart = dateFromUtcNanos(existing.startUtc);
  const existingEnd = dateFromUtcNanos(existing.endUtc);
  const existingDuration = existingEnd.getTime() - existingStart.getTime();
  const existingDurationMs = existingDuration > 0 ? existingDuration : ONE_HOUR_MS;
  const start = dateFromCalendarValue(changed.start, existingStart);
  const end = dateFromCalendarValue(changed.end, new Date(start.getTime() + existingDurationMs));

  return {
    title: existing.title,
    description: existing.description,
    location: existing.location,
    startUtc: utcNanosFromDate(start),
    endUtc: utcNanosFromDate(end),
    allDay: changed.allDay ?? existing.allDay,
  };
}

export function eventInputFromForm(form: {
  title: string;
  description: string;
  location: string;
  startLocal: string;
  endLocal: string;
  allDay: boolean;
}): CommunityEventInput {
  const start = fromDatetimeLocalValue(form.startLocal);
  const end = fromDatetimeLocalValue(form.endLocal);
  return {
    title: form.title.trim(),
    description: optionalText(form.description),
    location: optionalText(form.location),
    startUtc: utcNanosFromDate(start),
    endUtc: utcNanosFromDate(end),
    allDay: form.allDay,
  };
}

export function createEventShareToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function publicEventUrl(token: string): string {
  return `${window.location.origin}${routePaths.publicEvent(token)}`;
}

export function calendarEventUrl(communityId: bigint, eventId: bigint): string {
  return `${window.location.origin}${routePaths.event(communityId, eventId)}`;
}

export function formFromEvent(event?: CommunityEventPayload, fallbackStart = new Date()) {
  const start = event ? dateFromUtcNanos(event.startUtc) : fallbackStart;
  const end = event ? dateFromUtcNanos(event.endUtc) : defaultEventEnd(start);
  return {
    title: event?.title ?? '',
    description: optionalTextValue(event?.description),
    location: optionalTextValue(event?.location),
    startLocal: toDatetimeLocalValue(start),
    endLocal: toDatetimeLocalValue(end),
    allDay: event?.allDay ?? false,
    workspaceRole: event?.communityShare ?? null,
  };
}

export function canEditCalendarRole(role: WorkspaceRole | null | undefined): boolean {
  return role === WorkspaceRole.owner || role === WorkspaceRole.editor;
}

export function canOwnCalendarRole(role: WorkspaceRole | null | undefined): boolean {
  return role === WorkspaceRole.owner;
}

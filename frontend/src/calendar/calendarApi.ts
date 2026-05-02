import type { Principal } from "@icp-sdk/core/principal";
import type { CalendarEventInput, CalendarEventPayload, CalendarRole, CalendarRoleName } from "./types";

const NANOS_PER_MILLI = BigInt(1_000_000);
const ONE_HOUR_MS = 60 * 60 * 1000;

export function roleVariant(role: CalendarRoleName): CalendarRole {
  return { [role]: null } as CalendarRole;
}

export function optionalText(value: string): [] | [string] {
  const trimmed = value.trim();
  return trimmed.length > 0 ? [trimmed] : [];
}

export function optionalTextValue(value: [] | [string]): string {
  return value[0] ?? "";
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

export function readableDateTime(value: bigint): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dateFromUtcNanos(value));
}

export function compactPrincipal(value: Principal | string): string {
  const text = typeof value === "string" ? value : value.toText();
  if (text.length <= 20) return text;
  return `${text.slice(0, 10)}...${text.slice(-8)}`;
}

export function eventToCalendarItem(event: CalendarEventPayload) {
  const isCommunityShared = event.communityShare.length > 0;
  return {
    id: event.id.toString(),
    title: event.title,
    start: dateFromUtcNanos(event.startUtc),
    end: dateFromUtcNanos(event.endUtc),
    allDay: event.allDay,
    backgroundColor: isCommunityShared ? "#111111" : undefined,
    extendedProps: {
      eventId: event.id.toString(),
      role: event.role,
      communityShare: event.communityShare,
    },
  };
}

function dateFromCalendarValue(value: string | Date | undefined, fallback: Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.length > 0) return new Date(value);
  return fallback;
}

export function eventInputFromMovedEvent(
  existing: CalendarEventPayload,
  changed: { start?: string | Date; end?: string | Date; allDay?: boolean },
): CalendarEventInput {
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
}): CalendarEventInput {
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

export function formFromEvent(event?: CalendarEventPayload, fallbackStart = new Date()) {
  const start = event ? dateFromUtcNanos(event.startUtc) : fallbackStart;
  const end = event ? dateFromUtcNanos(event.endUtc) : defaultEventEnd(start);
  return {
    title: event?.title ?? "",
    description: event ? optionalTextValue(event.description) : "",
    location: event ? optionalTextValue(event.location) : "",
    startLocal: toDatetimeLocalValue(start),
    endLocal: toDatetimeLocalValue(end),
    allDay: event?.allDay ?? false,
    communityShare: event?.communityShare ?? [],
  };
}

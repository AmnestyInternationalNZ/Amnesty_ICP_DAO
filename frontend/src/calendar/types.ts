import type { Principal } from "@icp-sdk/core/principal";

export type CalendarRoleName = "owner" | "editor" | "viewer";

export type CalendarRole = {
  [K in CalendarRoleName]?: null;
};

export interface CalendarEventInput {
  title: string;
  description: [] | [string];
  location: [] | [string];
  startUtc: bigint;
  endUtc: bigint;
  allDay: boolean;
}

export interface CalendarParticipant {
  user: Principal;
  role: CalendarRole;
}

export interface CalendarEventPayload extends CalendarEventInput {
  id: bigint;
  communityId: bigint;
  owner: Principal;
  createdAt: bigint;
  updatedAt: bigint;
  archived: boolean;
  role: CalendarRole;
  communityShare: [] | [CalendarRole];
  access: CalendarParticipant[];
}

export function calendarRoleText(role: CalendarRole): CalendarRoleName {
  if ("owner" in role) return "owner";
  if ("editor" in role) return "editor";
  return "viewer";
}

export function canEditCalendarRole(role: CalendarRole): boolean {
  const roleName = calendarRoleText(role);
  return roleName === "owner" || roleName === "editor";
}

export function canOwnCalendarRole(role: CalendarRole): boolean {
  return calendarRoleText(role) === "owner";
}

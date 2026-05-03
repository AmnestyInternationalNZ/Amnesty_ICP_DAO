import { Principal } from '@dfinity/principal';
import { CalendarDays, Edit3, Globe2, Link as LinkIcon, Plus, Save, Share2, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventCalendarChangeInfo, EventCalendarClickInfo, EventCalendarDateInfo, EventCalendarSelectInfo } from '@event-calendar/core';
import type { CommunityEventPayload, CommunityMember, WorkspaceRole } from '../../backend';
import { WorkspaceRole as WorkspaceRoleValue } from '../../backend';
import {
  calendarEventUrl,
  canEditCalendarRole,
  canOwnCalendarRole,
  createEventShareToken,
  dateFromUtcNanos,
  defaultEventEnd,
  eventInputFromForm,
  eventInputFromMovedEvent,
  eventWorkspaceVisible,
  formFromEvent,
  publicEventUrl,
  readableDateTime,
  toDatetimeLocalValue,
} from '../../calendar/calendarApi';
import {
  useArchiveCommunityEvent,
  useCreateCommunityEvent,
  useGetCommunityEvent,
  useListCommunityEvents,
  useListCommunityMembers,
  useSetCommunityEventGrant,
  useSetCommunityEventPublicLink,
  useSetCommunityEventShare,
  useUpdateCommunityEvent,
} from '../../hooks/useQueries';
import { routePaths } from '../../routing/appRoutes';
import LoadingSpinner from '../LoadingSpinner';
import { EventCalendarWidget } from './EventCalendarWidget';

type CalendarForm = ReturnType<typeof formFromEvent>;
type CalendarFocus = { date: Date; view: string };

function sortEvents(events: CommunityEventPayload[]) {
  return [...events].sort((a, b) => Number(a.startUtc - b.startUtc));
}

function principalText(value: Principal): string {
  return value.toText();
}

function compactPrincipal(value: Principal | string): string {
  const text = typeof value === 'string' ? value : principalText(value);
  if (text.length <= 20) return text;
  return `${text.slice(0, 10)}...${text.slice(-8)}`;
}

function memberLabel(members: CommunityMember[], principal: Principal): string {
  const text = principalText(principal);
  const member = members.find((candidate) => principalText(candidate.principal) === text);
  return member?.profile?.name || compactPrincipal(text);
}

function roleLabel(role: WorkspaceRole | null | undefined): string {
  return role ?? 'viewer';
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard?.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function CommunityCalendarWorkspace({
  canManageCommunityWorkspace,
  communityId,
  communityName,
  initialEventId,
  onOpenEventRoute,
}: {
  canManageCommunityWorkspace: boolean;
  communityId: bigint;
  communityName: string;
  initialEventId?: bigint;
  onOpenEventRoute?: (eventId: bigint) => void;
}) {
  const listEvents = useListCommunityEvents(communityId);
  const eventDetail = useGetCommunityEvent(communityId, initialEventId ?? null);
  const { data: members = [] } = useListCommunityMembers(communityId);
  const createEvent = useCreateCommunityEvent();
  const updateEvent = useUpdateCommunityEvent();
  const archiveEvent = useArchiveCommunityEvent();
  const setEventGrant = useSetCommunityEventGrant();
  const setEventPublicLink = useSetCommunityEventPublicLink();
  const setEventShare = useSetCommunityEventShare();

  const [events, setEvents] = useState<CommunityEventPayload[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<bigint>();
  const [form, setForm] = useState<CalendarForm>(() => formFromEvent(undefined, new Date()));
  const [calendarFocus, setCalendarFocus] = useState<CalendarFocus>();
  const [grantPrincipal, setGrantPrincipal] = useState('');
  const [grantRole, setGrantRole] = useState<WorkspaceRole>(WorkspaceRoleValue.viewer);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>();
  const openedRouteEventRef = useRef<string>();

  useEffect(() => {
    setEvents(sortEvents(listEvents.data ?? []));
  }, [listEvents.data]);

  useEffect(() => {
    if (!initialEventId || !eventDetail.data) return;
    const event = eventDetail.data;
    const key = `event:${event.id.toString()}`;
    if (openedRouteEventRef.current === key) return;
    openedRouteEventRef.current = key;
    setEvents((current) => sortEvents([...current.filter((candidate) => candidate.id !== event.id), event]));
    openExisting(event);
    setCalendarFocus({ date: dateFromUtcNanos(event.startUtc), view: 'timeGridDay' });
  }, [eventDetail.data, initialEventId]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId),
    [events, selectedEventId],
  );
  const visibleEvents = useMemo(() => sortEvents(events), [events]);
  const canEditSelected = selectedEvent ? canEditCalendarRole(selectedEvent.role) : true;
  const canOwnSelected = selectedEvent ? canOwnCalendarRole(selectedEvent.role) : false;
  const canManageSelected = Boolean(selectedEvent && (canOwnSelected || canManageCommunityWorkspace));
  const isLoading = listEvents.isLoading || eventDetail.isLoading;

  function openCreate(start = new Date(), end = defaultEventEnd(start), allDay = false) {
    setSelectedEventId(undefined);
    setForm({
      ...formFromEvent(undefined, start),
      endLocal: toDatetimeLocalValue(end),
      allDay,
    });
    setMessage(undefined);
  }

  function openExisting(event: CommunityEventPayload) {
    setSelectedEventId(event.id);
    setForm(formFromEvent(event));
    setMessage(undefined);
  }

  async function refreshEvents() {
    const result = await listEvents.refetch();
    if (result.data) setEvents(sortEvents(result.data));
  }

  const handleDateClick = useCallback((info: EventCalendarDateInfo) => {
    openCreate(info.date, defaultEventEnd(info.date), info.allDay);
  }, []);

  const handleSelectRange = useCallback((info: EventCalendarSelectInfo) => {
    openCreate(info.start, info.end, info.allDay);
  }, []);

  const handleEventClick = useCallback(
    (info: EventCalendarClickInfo) => {
      if (!info.event.id) return;
      const clicked = events.find((event) => event.id.toString() === info.event.id);
      if (!clicked) return;
      openExisting(clicked);
      openedRouteEventRef.current = `event:${clicked.id.toString()}`;
      onOpenEventRoute?.(clicked.id);
    },
    [events, onOpenEventRoute],
  );

  const handleEventChange = useCallback(
    async (info: EventCalendarChangeInfo) => {
      if (!info.event.id) return;
      const existing = events.find((event) => event.id.toString() === info.event.id);
      if (!existing || !canEditCalendarRole(existing.role)) return;
      const input = eventInputFromMovedEvent(existing, info.event);
      const movedEvent = { ...existing, ...input };

      try {
        setSaving(true);
        await updateEvent.mutateAsync({ communityId, eventId: existing.id, input });
        setEvents((current) => sortEvents(current.map((event) => (event.id === existing.id ? movedEvent : event))));
        openExisting(movedEvent);
        setMessage('Event time saved.');
      } catch (error) {
        info.revert?.();
        setMessage(error instanceof Error ? error.message : String(error));
        await refreshEvents();
      } finally {
        setSaving(false);
      }
    },
    [communityId, events, updateEvent],
  );

  const handleEventDragStart = useCallback(() => {
    setMessage('Release the event to save the new time.');
  }, []);

  const handleEventDragStop = useCallback(() => {
    setMessage(undefined);
  }, []);

  async function saveEvent() {
    setSaving(true);
    setMessage(undefined);
    try {
      const input = eventInputFromForm(form);
      if (selectedEvent) {
        await updateEvent.mutateAsync({ communityId, eventId: selectedEvent.id, input });
        if (canManageSelected && selectedEvent.communityShare !== form.workspaceRole) {
          await setEventShare.mutateAsync({ communityId, eventId: selectedEvent.id, role: form.workspaceRole });
        }
        setMessage('Event updated.');
      } else {
        const id = await createEvent.mutateAsync({ communityId, input });
        if (form.workspaceRole) {
          await setEventShare.mutateAsync({ communityId, eventId: id, role: form.workspaceRole });
        }
        setSelectedEventId(id);
        onOpenEventRoute?.(id);
        setMessage('Event created.');
      }
      await refreshEvents();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!selectedEvent) return;
    setSaving(true);
    setMessage(undefined);
    try {
      await archiveEvent.mutateAsync({ communityId, eventId: selectedEvent.id });
      setSelectedEventId(undefined);
      setForm(formFromEvent(undefined, new Date()));
      window.history.pushState({}, '', routePaths.calendar(communityId));
      await refreshEvents();
      setMessage('Event deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function grantAccess() {
    if (!selectedEvent) return;
    const principal = grantPrincipal.trim();
    if (!principal) {
      setMessage('Choose a person or paste a principal to share this event.');
      return;
    }

    setSaving(true);
    setMessage(undefined);
    try {
      await setEventGrant.mutateAsync({
        communityId,
        eventId: selectedEvent.id,
        user: Principal.fromText(principal),
        role: grantRole,
      });
      setGrantPrincipal('');
      await refreshEvents();
      setMessage(`Granted ${grantRole} access.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, label: string) {
    if (await copyTextToClipboard(text)) {
      setMessage(`${label} copied.`);
    } else {
      setMessage(text);
    }
  }

  async function enablePublicLink() {
    if (!selectedEvent || !canOwnSelected) return;
    setSaving(true);
    setMessage(undefined);
    try {
      const token = selectedEvent.publicToken ?? createEventShareToken();
      await setEventPublicLink.mutateAsync({ communityId, eventId: selectedEvent.id, token });
      await refreshEvents();
      await copyText(publicEventUrl(token), 'Public event link');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function disablePublicLink() {
    if (!selectedEvent || !canOwnSelected) return;
    setSaving(true);
    setMessage(undefined);
    try {
      await setEventPublicLink.mutateAsync({ communityId, eventId: selectedEvent.id, token: null });
      await refreshEvents();
      setMessage('Public event link disabled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="calendar-shell">
      <div className="calendar-layout">
        <aside className="calendar-sidebar" aria-label="Event editor">
          <div className="calendar-sidebar-head">
            <div>
              <div className="amnesty-kicker">New event</div>
              <h2>{selectedEvent?.title || 'Plan a meeting'}</h2>
            </div>
            <button className="ghost-button compact-icon-button" disabled={saving} onClick={() => openCreate()} type="button">
              <Plus size={17} />
              New
            </button>
          </div>

          <label className="field-label">
            Title
            <input
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, title: event.currentTarget.value }))}
              placeholder="Meeting title"
              value={form.title}
            />
          </label>

          <div className="calendar-time-grid">
            <label className="field-label">
              Start
              <input
                disabled={!canEditSelected || saving}
                onChange={(event) => setForm((current) => ({ ...current, startLocal: event.currentTarget.value }))}
                type="datetime-local"
                value={form.startLocal}
              />
            </label>
            <label className="field-label">
              End
              <input
                disabled={!canEditSelected || saving}
                onChange={(event) => setForm((current) => ({ ...current, endLocal: event.currentTarget.value }))}
                type="datetime-local"
                value={form.endLocal}
              />
            </label>
          </div>

          <label className="calendar-check-row">
            <input
              checked={form.allDay}
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, allDay: event.currentTarget.checked }))}
              type="checkbox"
            />
            All-day event
          </label>

          <label className="field-label">
            Location
            <input
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, location: event.currentTarget.value }))}
              placeholder="Room, call link, or place"
              value={form.location}
            />
          </label>

          <label className="field-label">
            Notes
            <textarea
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, description: event.currentTarget.value }))}
              placeholder="Purpose, agenda, or preparation notes"
              rows={4}
              value={form.description}
            />
          </label>

          <label className="calendar-check-row">
            <input
              checked={form.workspaceRole !== null}
              disabled={saving || (Boolean(selectedEvent) && !canManageSelected)}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setForm((current) => ({ ...current, workspaceRole: checked ? (current.workspaceRole ?? WorkspaceRoleValue.viewer) : null }));
              }}
              type="checkbox"
            />
            Share to workspace
          </label>

          <div className="button-row">
            <button className="cta" disabled={!canEditSelected || saving || form.title.trim().length === 0} onClick={saveEvent} type="button">
              <Save size={17} />
              {saving ? 'Saving...' : selectedEvent ? 'Save event' : 'Create event'}
            </button>
            {selectedEvent && canManageSelected ? (
              <button className="ghost-button danger-button" disabled={saving} onClick={deleteEvent} type="button">
                <Trash2 size={17} />
                Delete
              </button>
            ) : null}
          </div>

          {selectedEvent ? (
            <div className="calendar-meta-panel">
              <div className="mini-row">
                <span>Role</span>
                <strong>{roleLabel(selectedEvent.role)}</strong>
              </div>
              <div className="mini-row">
                <span>Owner</span>
                <strong>{memberLabel(members, selectedEvent.owner)}</strong>
              </div>
              <div className="mini-row">
                <span>Start</span>
                <strong>{readableDateTime(selectedEvent.startUtc)}</strong>
              </div>
              <div className="mini-row">
                <span>Visibility</span>
                <strong>{eventWorkspaceVisible(selectedEvent) ? 'Workspace' : 'Private/shared'}</strong>
              </div>
              <div className="calendar-participants">
                <span>Participants</span>
                {selectedEvent.access.length > 0 ? (
                  <div>
                    {selectedEvent.access.map((entry) => (
                      <p key={principalText(entry.user)}>
                        <span>{memberLabel(members, entry.user)}</span>
                        <small>{entry.role}</small>
                      </p>
                    ))}
                  </div>
                ) : (
                  <strong>Owner only</strong>
                )}
              </div>
            </div>
          ) : null}

          {selectedEvent ? (
            <div className="share-panel">
              <div className="amnesty-kicker">Share links</div>
              <div className="calendar-link-actions">
                <button className="ghost-button" onClick={() => copyText(calendarEventUrl(communityId, selectedEvent.id), 'Event link')} type="button">
                  <LinkIcon size={17} />
                  Copy event link
                </button>
                {canOwnSelected ? (
                  selectedEvent.publicToken ? (
                    <>
                      <button className="ghost-button" onClick={() => copyText(publicEventUrl(selectedEvent.publicToken!), 'Public event link')} type="button">
                        <Globe2 size={17} />
                        Copy public link
                      </button>
                      <button className="ghost-button danger-button" disabled={saving} onClick={disablePublicLink} type="button">
                        Disable public link
                      </button>
                    </>
                  ) : (
                    <button className="ghost-button" disabled={saving} onClick={enablePublicLink} type="button">
                      <Globe2 size={17} />
                      Create public link
                    </button>
                  )
                ) : null}
              </div>

              {canManageSelected ? (
                <>
                  <div className="amnesty-kicker">Add participant</div>
                  <div className="share-row">
                    <input
                      aria-label="Principal to grant calendar event access"
                      list="calendar-share-members"
                      onChange={(event) => setGrantPrincipal(event.currentTarget.value)}
                      placeholder="Search name or paste principal"
                      value={grantPrincipal}
                    />
                    <datalist id="calendar-share-members">
                      {members.map((member) => (
                        <option key={principalText(member.principal)} label={member.profile?.name ?? principalText(member.principal)} value={principalText(member.principal)} />
                      ))}
                    </datalist>
                    <select aria-label="Calendar event role" onChange={(event) => setGrantRole(event.currentTarget.value as WorkspaceRole)} value={grantRole}>
                      <option value={WorkspaceRoleValue.viewer}>Viewer</option>
                      <option value={WorkspaceRoleValue.editor}>Editor</option>
                    </select>
                  </div>
                  <button className="ghost-button" disabled={saving} onClick={grantAccess} type="button">
                    <Share2 size={17} />
                    Grant access
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {message ? <p className="notice">{message}</p> : null}
        </aside>

        <div className="calendar-main">
          <div className="workspace-hero calendar-hero">
            <div>
              <div className="amnesty-kicker text-amnesty-orange">Calendar</div>
              <h1>Plan with purpose.</h1>
              <p>Schedule events, meetings, and actions so your community can take action together.</p>
              <small>{communityName}</small>
            </div>
          </div>

          <div className="calendar-toolbar">
            <div>
              <div className="amnesty-kicker text-amnesty-orange">UTC-backed calendar</div>
              <h2>{isLoading ? 'Loading events...' : `${visibleEvents.length} visible event${visibleEvents.length === 1 ? '' : 's'}`}</h2>
            </div>
            <div className="calendar-legend">
              <span><CalendarDays size={15} /> My events</span>
              <span><Users size={15} /> Workspace visible</span>
              <span><Edit3 size={15} /> Drag to reschedule</span>
            </div>
          </div>

          {isLoading ? (
            <div className="calendar-empty"><LoadingSpinner /></div>
          ) : listEvents.error || eventDetail.error ? (
            <div className="calendar-empty">
              <h3>Could not load calendar.</h3>
              <p>{String(listEvents.error ?? eventDetail.error)}</p>
            </div>
          ) : (
            <EventCalendarWidget
              canEdit={!saving}
              events={visibleEvents}
              focusDate={calendarFocus?.date}
              focusView={calendarFocus?.view}
              onDateClick={handleDateClick}
              onEventChange={handleEventChange}
              onEventClick={handleEventClick}
              onEventDragStart={handleEventDragStart}
              onEventDragStop={handleEventDragStop}
              onSelectRange={handleSelectRange}
            />
          )}
        </div>
      </div>
    </section>
  );
}

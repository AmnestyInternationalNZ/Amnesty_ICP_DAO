import { Principal } from '@dfinity/principal';
import { CalendarDays, Edit3, Globe2, Link as LinkIcon, Plus, Save, Share2, Trash2, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EventCalendarChangeInfo, EventCalendarClickInfo, EventCalendarDateInfo, EventCalendarSelectInfo } from '@event-calendar/core';
import { useTranslation } from 'react-i18next';
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

function roleLabel(role: WorkspaceRole | null | undefined, t: ReturnType<typeof useTranslation>['t']): string {
  return t(`workspace.roles.${role ?? 'viewer'}`);
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
  const { t } = useTranslation();
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
        setMessage(t('calendar.messages.timeSaved'));
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
    setMessage(t('calendar.messages.releaseToSave'));
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
        setMessage(t('calendar.messages.updated'));
      } else {
        const id = await createEvent.mutateAsync({ communityId, input });
        if (form.workspaceRole) {
          await setEventShare.mutateAsync({ communityId, eventId: id, role: form.workspaceRole });
        }
        setSelectedEventId(id);
        onOpenEventRoute?.(id);
        setMessage(t('calendar.messages.created'));
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
      setMessage(t('calendar.messages.deleted'));
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
      setMessage(t('calendar.messages.chooseParticipant'));
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
      setMessage(t('calendar.messages.grantedAccess', { role: roleLabel(grantRole, t) }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, label: string) {
    if (await copyTextToClipboard(text)) {
      setMessage(t('calendar.messages.copied', { label }));
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
      await copyText(publicEventUrl(token), t('calendar.share.publicEventLink'));
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
      setMessage(t('calendar.messages.publicLinkDisabled'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="calendar-shell">
      <div className="calendar-layout">
        <aside className="calendar-sidebar" aria-label={t('calendar.editor.aria')}>
          <div className="calendar-sidebar-head">
            <div>
              <div className="amnesty-kicker">{selectedEvent ? t('calendar.editTitle') : t('calendar.createTitle')}</div>
              <h2>{selectedEvent?.title || t('calendar.editor.planMeeting')}</h2>
            </div>
            <button className="ghost-button compact-icon-button" disabled={saving} onClick={() => openCreate()} type="button">
              <Plus size={17} />
              {t('calendar.actions.new')}
            </button>
          </div>

          <label className="field-label">
            {t('calendar.fields.title')}
            <input
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, title: event.currentTarget.value }))}
              placeholder={t('calendar.fields.meetingTitlePlaceholder')}
              value={form.title}
            />
          </label>

          <div className="calendar-time-grid">
            <label className="field-label">
              {t('calendar.fields.start')}
              <input
                disabled={!canEditSelected || saving}
                onChange={(event) => setForm((current) => ({ ...current, startLocal: event.currentTarget.value }))}
                type="datetime-local"
                value={form.startLocal}
              />
            </label>
            <label className="field-label">
              {t('calendar.fields.end')}
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
            {t('calendar.fields.allDay')}
          </label>

          <label className="field-label">
            {t('calendar.fields.location')}
            <input
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, location: event.currentTarget.value }))}
              placeholder={t('calendar.fields.locationPlaceholder')}
              value={form.location}
            />
          </label>

          <label className="field-label">
            {t('calendar.fields.notes')}
            <textarea
              disabled={!canEditSelected || saving}
              onChange={(event) => setForm((current) => ({ ...current, description: event.currentTarget.value }))}
              placeholder={t('calendar.fields.notesPlaceholder')}
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
            {t('calendar.fields.shareToWorkspace')}
          </label>

          <div className="button-row">
            <button className="cta" disabled={!canEditSelected || saving || form.title.trim().length === 0} onClick={saveEvent} type="button">
              <Save size={17} />
              {saving ? t('common.loading.saving') : selectedEvent ? t('calendar.actions.saveEvent') : t('calendar.actions.create')}
            </button>
            {selectedEvent && canManageSelected ? (
              <button className="ghost-button danger-button" disabled={saving} onClick={deleteEvent} type="button">
                <Trash2 size={17} />
                {t('common.actions.delete')}
              </button>
            ) : null}
          </div>

          {selectedEvent ? (
            <div className="calendar-meta-panel">
              <div className="mini-row">
                <span>{t('calendar.meta.role')}</span>
                <strong>{roleLabel(selectedEvent.role, t)}</strong>
              </div>
              <div className="mini-row">
                <span>{t('calendar.meta.owner')}</span>
                <strong>{memberLabel(members, selectedEvent.owner)}</strong>
              </div>
              <div className="mini-row">
                <span>{t('calendar.meta.start')}</span>
                <strong>{readableDateTime(selectedEvent.startUtc)}</strong>
              </div>
              <div className="mini-row">
                <span>{t('calendar.meta.visibility')}</span>
                <strong>{eventWorkspaceVisible(selectedEvent) ? t('calendar.meta.workspace') : t('calendar.meta.privateShared')}</strong>
              </div>
              <div className="calendar-participants">
                <span>{t('calendar.meta.participants')}</span>
                {selectedEvent.access.length > 0 ? (
                  <div>
                    {selectedEvent.access.map((entry) => (
                      <p key={principalText(entry.user)}>
                        <span>{memberLabel(members, entry.user)}</span>
                        <small>{roleLabel(entry.role, t)}</small>
                      </p>
                    ))}
                  </div>
                ) : (
                  <strong>{t('calendar.meta.ownerOnly')}</strong>
                )}
              </div>
            </div>
          ) : null}

          {selectedEvent ? (
            <div className="share-panel">
              <div className="amnesty-kicker">{t('calendar.share.title')}</div>
              <div className="calendar-link-actions">
                <button className="ghost-button" onClick={() => copyText(calendarEventUrl(communityId, selectedEvent.id), t('calendar.share.eventLink'))} type="button">
                  <LinkIcon size={17} />
                  {t('calendar.share.copyEventLink')}
                </button>
                {canOwnSelected ? (
                  selectedEvent.publicToken ? (
                    <>
                      <button className="ghost-button" onClick={() => copyText(publicEventUrl(selectedEvent.publicToken!), t('calendar.share.publicEventLink'))} type="button">
                        <Globe2 size={17} />
                        {t('calendar.share.copyPublicLink')}
                      </button>
                      <button className="ghost-button danger-button" disabled={saving} onClick={disablePublicLink} type="button">
                        {t('calendar.share.disablePublicLink')}
                      </button>
                    </>
                  ) : (
                    <button className="ghost-button" disabled={saving} onClick={enablePublicLink} type="button">
                      <Globe2 size={17} />
                      {t('calendar.share.createPublicLink')}
                    </button>
                  )
                ) : null}
              </div>

              {canManageSelected ? (
                <>
                  <div className="amnesty-kicker">{t('calendar.share.addParticipant')}</div>
                  <div className="share-row">
                    <input
                      aria-label={t('calendar.share.principalToGrant')}
                      list="calendar-share-members"
                      onChange={(event) => setGrantPrincipal(event.currentTarget.value)}
                      placeholder={t('calendar.share.principalPlaceholder')}
                      value={grantPrincipal}
                    />
                    <datalist id="calendar-share-members">
                      {members.map((member) => (
                        <option key={principalText(member.principal)} label={member.profile?.name ?? principalText(member.principal)} value={principalText(member.principal)} />
                      ))}
                    </datalist>
                    <select aria-label={t('calendar.share.eventRole')} onChange={(event) => setGrantRole(event.currentTarget.value as WorkspaceRole)} value={grantRole}>
                      <option value={WorkspaceRoleValue.viewer}>{t('workspace.roles.viewer')}</option>
                      <option value={WorkspaceRoleValue.editor}>{t('workspace.roles.editor')}</option>
                    </select>
                  </div>
                  <button className="ghost-button" disabled={saving} onClick={grantAccess} type="button">
                    <Share2 size={17} />
                    {t('calendar.share.grantAccess')}
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
              <div className="amnesty-kicker text-amnesty-orange">{t('calendar.hero.kicker')}</div>
              <h1>{t('calendar.hero.title')}</h1>
              <p>{t('calendar.hero.body')}</p>
              <small>{communityName}</small>
            </div>
          </div>

          <div className="calendar-toolbar">
            <div>
              <div className="amnesty-kicker text-amnesty-orange">{t('calendar.hero.utcBacked')}</div>
              <h2>{isLoading ? t('calendar.loadingEvents') : t('calendar.visibleEvents', { count: visibleEvents.length })}</h2>
            </div>
            <div className="calendar-legend">
              <span><CalendarDays size={15} /> {t('calendar.legend.myEvents')}</span>
              <span><Users size={15} /> {t('calendar.legend.workspaceVisible')}</span>
              <span><Edit3 size={15} /> {t('calendar.legend.dragToReschedule')}</span>
            </div>
          </div>

          {isLoading ? (
            <div className="calendar-empty"><LoadingSpinner /></div>
          ) : listEvents.error || eventDetail.error ? (
            <div className="calendar-empty">
              <h3>{t('calendar.errors.loadFailed')}</h3>
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

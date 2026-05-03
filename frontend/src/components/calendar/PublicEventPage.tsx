import { CalendarDays, Edit3, Globe2, MapPin, Users } from 'lucide-react';
import { useMemo } from 'react';
import {
  dateFromUtcNanos,
  formFromEvent,
  readableDateTime,
} from '../../calendar/calendarApi';
import { useGetPublicCommunityEvent } from '../../hooks/useQueries';
import LoadingSpinner from '../LoadingSpinner';
import { EventCalendarWidget } from './EventCalendarWidget';

export default function PublicEventPage({ token }: { token?: string }) {
  const { data: event, error, isLoading } = useGetPublicCommunityEvent(token ?? null);
  const events = useMemo(() => (event ? [event] : []), [event]);
  const form = formFromEvent(event);

  if (!token || (!isLoading && !event)) {
    return (
      <section className="calendar-shell public-calendar-shell">
        <div className="calendar-lock">
          <h1>Public event not found.</h1>
          <p>{error ? String(error) : 'This public event link may have been disabled or mistyped.'}</p>
        </div>
      </section>
    );
  }

  if (isLoading || !event) {
    return (
      <section className="calendar-shell public-calendar-shell">
        <div className="calendar-lock">
          <LoadingSpinner size="large" />
          <h1>Opening public event.</h1>
          <p>Loading the single event attached to this public link.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="calendar-shell public-calendar-shell">
      <div className="calendar-layout">
        <aside className="calendar-sidebar" aria-label="Public event details">
          <div className="calendar-sidebar-head">
            <div>
              <div className="amnesty-kicker">Public event</div>
              <h2>{event.title}</h2>
            </div>
            <Globe2 size={20} />
          </div>

          <label className="field-label">
            Title
            <input disabled value={form.title} />
          </label>

          <div className="calendar-time-grid">
            <label className="field-label">
              Start
              <input disabled type="datetime-local" value={form.startLocal} />
            </label>
            <label className="field-label">
              End
              <input disabled type="datetime-local" value={form.endLocal} />
            </label>
          </div>

          <label className="calendar-check-row">
            <input checked={form.allDay} disabled readOnly type="checkbox" />
            All-day event
          </label>

          <label className="field-label">
            Location
            <input disabled value={form.location} />
          </label>

          <label className="field-label">
            Notes
            <textarea disabled rows={4} value={form.description} />
          </label>

          <div className="calendar-meta-panel">
            <div className="mini-row">
              <span>Role</span>
              <strong>public read-only</strong>
            </div>
            <div className="mini-row">
              <span>Start</span>
              <strong>{readableDateTime(event.startUtc)}</strong>
            </div>
            {event.location ? (
              <div className="mini-row">
                <span>Location</span>
                <strong><MapPin size={13} /> {event.location}</strong>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="calendar-main">
          <div className="calendar-toolbar">
            <div>
              <div className="amnesty-kicker text-amnesty-orange">Public calendar</div>
              <h1>{event.title}</h1>
            </div>
            <div className="calendar-legend">
              <span><CalendarDays size={15} /> Public event</span>
              <span><Users size={15} /> Read-only</span>
              <span><Edit3 size={15} /> No edits</span>
            </div>
          </div>
          <EventCalendarWidget
            canEdit={false}
            events={events}
            focusDate={dateFromUtcNanos(event.startUtc)}
            focusView="timeGridDay"
            onDateClick={() => undefined}
            onEventChange={() => undefined}
            onEventClick={() => undefined}
            onSelectRange={() => undefined}
          />
        </div>
      </div>
    </section>
  );
}

import { CalendarDays, Edit3, Globe2, MapPin, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  dateFromUtcNanos,
  formFromEvent,
  readableDateTime,
} from '../../calendar/calendarApi';
import { calendarButtonText } from '../../calendar/calendarLocale';
import { useGetPublicCommunityEvent } from '../../hooks/useQueries';
import { useLocalePreference } from '../../i18n/preferences';
import { getIntlLocale } from '../../i18n/types';
import LoadingSpinner from '../LoadingSpinner';
import { EventCalendarWidget } from './EventCalendarWidget';

export default function PublicEventPage({ token }: { token?: string }) {
  const { t } = useTranslation();
  const { locale } = useLocalePreference();
  const intlLocale = getIntlLocale(locale);
  const { data: event, error, isLoading } = useGetPublicCommunityEvent(token ?? null);
  const events = useMemo(() => (event ? [event] : []), [event]);
  const localizedCalendarButtons = useMemo(() => calendarButtonText(locale), [locale]);
  const form = formFromEvent(event);

  if (!token || (!isLoading && !event)) {
    return (
      <section className="calendar-shell public-calendar-shell">
        <div className="calendar-lock">
          <h1>{t('calendar.public.notFoundTitle')}</h1>
          <p>{error ? String(error) : t('calendar.public.notFoundBody')}</p>
        </div>
      </section>
    );
  }

  if (isLoading || !event) {
    return (
      <section className="calendar-shell public-calendar-shell">
        <div className="calendar-lock">
          <LoadingSpinner size="large" />
          <h1>{t('calendar.public.openingTitle')}</h1>
          <p>{t('calendar.public.openingBody')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="calendar-shell public-calendar-shell">
      <div className="calendar-layout">
        <aside className="calendar-sidebar" aria-label={t('calendar.public.detailsAria')}>
          <div className="calendar-sidebar-head">
            <div>
              <div className="amnesty-kicker">{t('calendar.public.event')}</div>
              <h2>{event.title}</h2>
            </div>
            <Globe2 size={20} />
          </div>

          <label className="field-label">
            {t('calendar.fields.title')}
            <input disabled value={form.title} />
          </label>

          <div className="calendar-time-grid">
            <label className="field-label">
              {t('calendar.fields.start')}
              <input disabled type="datetime-local" value={form.startLocal} />
            </label>
            <label className="field-label">
              {t('calendar.fields.end')}
              <input disabled type="datetime-local" value={form.endLocal} />
            </label>
          </div>

          <label className="calendar-check-row">
            <input checked={form.allDay} disabled readOnly type="checkbox" />
            {t('calendar.fields.allDay')}
          </label>

          <label className="field-label">
            {t('calendar.fields.location')}
            <input disabled value={form.location} />
          </label>

          <label className="field-label">
            {t('calendar.fields.notes')}
            <textarea disabled rows={4} value={form.description} />
          </label>

          <div className="calendar-meta-panel">
            <div className="mini-row">
              <span>{t('calendar.meta.role')}</span>
              <strong>{t('calendar.public.readOnlyRole')}</strong>
            </div>
            <div className="mini-row">
              <span>{t('calendar.meta.start')}</span>
              <strong>{readableDateTime(event.startUtc, intlLocale)}</strong>
            </div>
            {event.location ? (
              <div className="mini-row">
                <span>{t('calendar.fields.location')}</span>
                <strong><MapPin size={13} /> {event.location}</strong>
              </div>
            ) : null}
          </div>
        </aside>

        <div className="calendar-main">
          <div className="calendar-toolbar">
            <div>
              <div className="amnesty-kicker text-amnesty-orange">{t('calendar.public.calendar')}</div>
              <h1>{event.title}</h1>
            </div>
            <div className="calendar-legend">
              <span><CalendarDays size={15} /> {t('calendar.public.event')}</span>
              <span><Users size={15} /> {t('calendar.public.readOnly')}</span>
              <span><Edit3 size={15} /> {t('calendar.public.noEdits')}</span>
            </div>
          </div>
          <EventCalendarWidget
            canEdit={false}
            events={events}
            focusDate={dateFromUtcNanos(event.startUtc)}
            focusView="timeGridDay"
            locale={intlLocale}
            buttonText={localizedCalendarButtons}
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

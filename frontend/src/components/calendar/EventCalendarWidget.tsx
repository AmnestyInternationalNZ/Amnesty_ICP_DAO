import '@event-calendar/core/index.css';
import { createCalendar, destroyCalendar, DayGrid, Interaction, List, TimeGrid } from '@event-calendar/core';
import type {
  EventCalendarChangeInfo,
  EventCalendarClickInfo,
  EventCalendarDateInfo,
  EventCalendarInstance,
  EventCalendarOptions,
  EventCalendarSelectInfo,
} from '@event-calendar/core';
import { useEffect, useMemo, useRef } from 'react';
import { eventToCalendarItem } from '../../calendar/calendarApi';
import type { CommunityEventPayload } from '../../backend';

export function EventCalendarWidget({
  canEdit,
  events,
  focusDate,
  focusView,
  onDateClick,
  onEventChange,
  onEventClick,
  onEventDragStart,
  onEventDragStop,
  onSelectRange,
}: {
  canEdit: boolean;
  events: CommunityEventPayload[];
  focusDate?: Date;
  focusView?: string;
  onDateClick: (info: EventCalendarDateInfo) => void;
  onEventChange: (info: EventCalendarChangeInfo) => void;
  onEventClick: (info: EventCalendarClickInfo) => void;
  onEventDragStart?: (info: EventCalendarClickInfo) => void;
  onEventDragStop?: (info: EventCalendarClickInfo) => void;
  onSelectRange: (info: EventCalendarSelectInfo) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<EventCalendarInstance>();
  const calendarEvents = useMemo(() => events.map(eventToCalendarItem), [events]);
  const focusTime = focusDate?.getTime();

  useEffect(() => {
    if (!hostRef.current || calendarRef.current) return;

    const options: EventCalendarOptions = {
      view: focusView ?? 'timeGridWeek',
      date: focusDate,
      timeZone: 'local',
      height: '680px',
      nowIndicator: true,
      editable: canEdit,
      selectable: canEdit,
      events: calendarEvents,
      scrollTime: '08:00:00',
      slotDuration: '00:30:00',
      headerToolbar: {
        start: 'title',
        center: '',
        end: 'today dayGridMonth,timeGridWeek,timeGridDay,listWeek prev,next',
      },
      buttonText: {
        today: 'Today',
        dayGridMonth: 'Month',
        timeGridWeek: 'Week',
        timeGridDay: 'Day',
        listWeek: 'List',
      },
      dateClick: onDateClick,
      eventClick: onEventClick,
      eventDragStart: onEventDragStart,
      eventDragStop: onEventDragStop,
      eventDrop: onEventChange,
      eventResizeStart: onEventDragStart,
      eventResizeStop: onEventDragStop,
      eventResize: onEventChange,
      select: onSelectRange,
    };

    calendarRef.current = createCalendar(hostRef.current, [DayGrid, TimeGrid, List, Interaction], options);

    return () => {
      const calendar = calendarRef.current;
      calendarRef.current = undefined;
      if (calendar) void destroyCalendar(calendar);
    };
  }, []);

  useEffect(() => {
    calendarRef.current?.setOption('events', calendarEvents);
  }, [calendarEvents]);

  useEffect(() => {
    if (!calendarRef.current || focusTime === undefined) return;
    calendarRef.current.setOption('date', new Date(focusTime));
    if (focusView) {
      calendarRef.current.setOption('view', focusView);
    }
  }, [focusTime, focusView]);

  useEffect(() => {
    calendarRef.current?.setOption('editable', canEdit);
    calendarRef.current?.setOption('selectable', canEdit);
  }, [canEdit]);

  useEffect(() => {
    calendarRef.current?.setOption('dateClick', onDateClick);
    calendarRef.current?.setOption('eventClick', onEventClick);
    calendarRef.current?.setOption('eventDragStart', onEventDragStart);
    calendarRef.current?.setOption('eventDragStop', onEventDragStop);
    calendarRef.current?.setOption('eventDrop', onEventChange);
    calendarRef.current?.setOption('eventResizeStart', onEventDragStart);
    calendarRef.current?.setOption('eventResizeStop', onEventDragStop);
    calendarRef.current?.setOption('eventResize', onEventChange);
    calendarRef.current?.setOption('select', onSelectRange);
  }, [onDateClick, onEventChange, onEventClick, onEventDragStart, onEventDragStop, onSelectRange]);

  return <div className="event-calendar-host" ref={hostRef} />;
}

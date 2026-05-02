declare module "@event-calendar/core" {
  export interface EventCalendarEvent {
    id?: string;
    title?: string;
    start: string | Date;
    end?: string | Date;
    allDay?: boolean;
    backgroundColor?: string;
    extendedProps?: Record<string, unknown>;
  }

  export interface EventCalendarDateInfo {
    date: Date;
    dateStr: string;
    allDay: boolean;
    jsEvent?: MouseEvent;
  }

  export interface EventCalendarSelectInfo {
    start: Date;
    end: Date;
    startStr: string;
    endStr: string;
    allDay: boolean;
    jsEvent?: MouseEvent;
  }

  export interface EventCalendarChangeInfo {
    event: EventCalendarEvent;
    oldEvent?: EventCalendarEvent;
    revert?: () => void;
  }

  export interface EventCalendarClickInfo {
    event: EventCalendarEvent;
    jsEvent: MouseEvent;
    el: HTMLElement;
  }

  export interface EventCalendarOptions {
    view?: string;
    date?: Date | string;
    events?: EventCalendarEvent[];
    editable?: boolean;
    selectable?: boolean;
    nowIndicator?: boolean;
    timeZone?: "local" | "UTC" | string;
    height?: string;
    slotDuration?: string | Record<string, number>;
    scrollTime?: string;
    headerToolbar?: {
      start?: string;
      center?: string;
      end?: string;
    };
    buttonText?: Record<string, string>;
    views?: Record<string, Record<string, unknown>>;
    eventClick?: (info: EventCalendarClickInfo) => void;
    eventDragStart?: (info: EventCalendarClickInfo) => void;
    eventDragStop?: (info: EventCalendarClickInfo) => void;
    eventDrop?: (info: EventCalendarChangeInfo) => void;
    eventResizeStart?: (info: EventCalendarClickInfo) => void;
    eventResizeStop?: (info: EventCalendarClickInfo) => void;
    eventResize?: (info: EventCalendarChangeInfo) => void;
    dateClick?: (info: EventCalendarDateInfo) => void;
    select?: (info: EventCalendarSelectInfo) => void;
  }

  export interface EventCalendarInstance {
    setOption: (name: string, value: unknown) => EventCalendarInstance;
    getOption: (name: string) => unknown;
    refetchEvents: () => EventCalendarInstance;
    addEvent: (event: EventCalendarEvent) => EventCalendarEvent;
    updateEvent: (event: EventCalendarEvent) => EventCalendarEvent | null;
    removeEventById: (id: string) => EventCalendarInstance;
    unselect: () => EventCalendarInstance;
  }

  export const DayGrid: unknown;
  export const Interaction: unknown;
  export const List: unknown;
  export const TimeGrid: unknown;

  export function createCalendar(
    target: HTMLElement,
    plugins: unknown[],
    options: EventCalendarOptions,
  ): EventCalendarInstance;

  export function destroyCalendar(calendar: EventCalendarInstance): void | Promise<void>;
}

declare module "@event-calendar/core/index.css";

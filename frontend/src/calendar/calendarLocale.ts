import type { SupportedLocale } from '../i18n/types';

export type CalendarButtonText = {
  today: string;
  dayGridMonth: string;
  timeGridWeek: string;
  timeGridDay: string;
  listWeek: string;
};

const CALENDAR_BUTTON_TEXT: Record<SupportedLocale, CalendarButtonText> = {
  en: { today: 'Today', dayGridMonth: 'Month', timeGridWeek: 'Week', timeGridDay: 'Day', listWeek: 'List' },
  ar: { today: 'اليوم', dayGridMonth: 'الشهر', timeGridWeek: 'الأسبوع', timeGridDay: 'اليوم', listWeek: 'قائمة' },
  fr: { today: "Aujourd'hui", dayGridMonth: 'Mois', timeGridWeek: 'Semaine', timeGridDay: 'Jour', listWeek: 'Liste' },
  ru: { today: 'Сегодня', dayGridMonth: 'Месяц', timeGridWeek: 'Неделя', timeGridDay: 'День', listWeek: 'Список' },
  'zh-Hans': { today: '今天', dayGridMonth: '月', timeGridWeek: '周', timeGridDay: '日', listWeek: '列表' },
  my: { today: 'ယနေ့', dayGridMonth: 'လ', timeGridWeek: 'အပတ်', timeGridDay: 'ရက်', listWeek: 'စာရင်း' },
  fa: { today: 'امروز', dayGridMonth: 'ماه', timeGridWeek: 'هفته', timeGridDay: 'روز', listWeek: 'فهرست' },
  sw: { today: 'Leo', dayGridMonth: 'Mwezi', timeGridWeek: 'Wiki', timeGridDay: 'Siku', listWeek: 'Orodha' },
  am: { today: 'ዛሬ', dayGridMonth: 'ወር', timeGridWeek: 'ሳምንት', timeGridDay: 'ቀን', listWeek: 'ዝርዝር' },
  ko: { today: '오늘', dayGridMonth: '월', timeGridWeek: '주', timeGridDay: '일', listWeek: '목록' },
};

export function calendarButtonText(locale: SupportedLocale): CalendarButtonText {
  return CALENDAR_BUTTON_TEXT[locale] ?? CALENDAR_BUTTON_TEXT.en;
}

export function firstDayForIntlLocale(locale: string): number {
  const LocaleConstructor = (Intl as unknown as {
    Locale?: new (value: string) => { weekInfo?: { firstDay?: number } };
  }).Locale;
  const firstDay = LocaleConstructor ? new LocaleConstructor(locale).weekInfo?.firstDay : undefined;
  if (firstDay === 7) return 0;
  if (typeof firstDay === 'number') return firstDay;
  return locale.startsWith('en') ? 0 : 1;
}

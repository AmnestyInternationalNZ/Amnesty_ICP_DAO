export type LocaleDirection = 'ltr' | 'rtl';

export interface LocaleDefinition {
    code: SupportedLocale;
    direction: LocaleDirection;
    englishName: string;
    intlLocale: string;
    nativeName: string;
}

export const LOCALE_DEFINITIONS = [
    {
        code: 'en',
        direction: 'ltr',
        englishName: 'English',
        intlLocale: 'en',
        nativeName: 'English'
    },
    {
        code: 'ar',
        direction: 'rtl',
        englishName: 'Arabic',
        intlLocale: 'ar',
        nativeName: 'العربية'
    },
    {
        code: 'fr',
        direction: 'ltr',
        englishName: 'French',
        intlLocale: 'fr',
        nativeName: 'Français'
    },
    {
        code: 'ru',
        direction: 'ltr',
        englishName: 'Russian',
        intlLocale: 'ru',
        nativeName: 'Русский'
    },
    {
        code: 'zh-Hans',
        direction: 'ltr',
        englishName: 'Mandarin Chinese',
        intlLocale: 'zh-Hans',
        nativeName: '简体中文'
    },
    {
        code: 'my',
        direction: 'ltr',
        englishName: 'Burmese',
        intlLocale: 'my',
        nativeName: 'မြန်မာ'
    },
    {
        code: 'fa',
        direction: 'rtl',
        englishName: 'Persian (Farsi)',
        intlLocale: 'fa',
        nativeName: 'فارسی'
    },
    {
        code: 'sw',
        direction: 'ltr',
        englishName: 'Swahili',
        intlLocale: 'sw',
        nativeName: 'Kiswahili'
    },
    {
        code: 'am',
        direction: 'ltr',
        englishName: 'Amharic',
        intlLocale: 'am',
        nativeName: 'አማርኛ'
    },
    {
        code: 'ko',
        direction: 'ltr',
        englishName: 'Korean',
        intlLocale: 'ko',
        nativeName: '한국어'
    }
] as const;

export type SupportedLocale = (typeof LOCALE_DEFINITIONS)[number]['code'];

export const SUPPORTED_LOCALES = LOCALE_DEFINITIONS.map((locale) => locale.code) as SupportedLocale[];

export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const RTL_LOCALES = LOCALE_DEFINITIONS.filter((locale) => locale.direction === 'rtl').map(
    (locale) => locale.code
) as SupportedLocale[];

export function isSupportedLocale(locale: string | null | undefined): locale is SupportedLocale {
    return Boolean(locale && SUPPORTED_LOCALES.includes(locale as SupportedLocale));
}

export function normalizeLocale(locale: string | null | undefined): SupportedLocale | null {
    if (!locale) {
        return null;
    }

    const normalized = locale.trim();
    const lower = normalized.toLowerCase();

    return (
        SUPPORTED_LOCALES.find((supported) => {
            const supportedLower = supported.toLowerCase();
            return lower === supportedLower || lower.startsWith(`${supportedLower}-`);
        }) ??
        (lower === 'zh' || lower.startsWith('zh-cn') || lower.startsWith('zh-hans')
            ? 'zh-Hans'
            : null)
    );
}

export function getLocaleDefinition(locale: SupportedLocale): LocaleDefinition {
    return LOCALE_DEFINITIONS.find((definition) => definition.code === locale) ?? LOCALE_DEFINITIONS[0];
}

export function getLocaleDirection(locale: SupportedLocale): LocaleDirection {
    return getLocaleDefinition(locale).direction;
}

export function getIntlLocale(locale: string | null | undefined): string {
    const supportedLocale = normalizeLocale(locale) ?? DEFAULT_LOCALE;
    return getLocaleDefinition(supportedLocale).intlLocale;
}

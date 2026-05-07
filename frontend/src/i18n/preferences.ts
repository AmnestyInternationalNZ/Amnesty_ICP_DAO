import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LOCALE, LOCALE_DEFINITIONS, SUPPORTED_LOCALES, normalizeLocale, type SupportedLocale } from './types';

const LOCALE_STORAGE_KEY = 'amnesty.locale';

export function getSavedLocalePreference(): SupportedLocale | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

export function saveLocalePreference(locale: SupportedLocale): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function resolveLocalePreference(options?: {
    communityLocale?: string | null;
    browserLanguages?: readonly string[];
}): SupportedLocale {
    // Locale selection priority:
    // 1. Explicit saved user preference in localStorage.
    // 2. Future community default locale when the backend exposes one.
    // 3. Browser language preference.
    // 4. English as the final fallback.
    const savedPreference = getSavedLocalePreference();
    if (savedPreference) {
        return savedPreference;
    }

    const communityLocale = normalizeLocale(options?.communityLocale);
    if (communityLocale) {
        return communityLocale;
    }

    const browserLanguages =
        options?.browserLanguages ??
        (typeof navigator !== 'undefined'
            ? navigator.languages.length > 0
                ? navigator.languages
                : [navigator.language]
            : []);

    for (const language of browserLanguages) {
        const matchedLocale = normalizeLocale(language);
        if (matchedLocale) {
            return matchedLocale;
        }
    }

    return DEFAULT_LOCALE;
}

export function useLocalePreference() {
    const { i18n } = useTranslation();
    const locale = normalizeLocale(i18n.resolvedLanguage ?? i18n.language) ?? DEFAULT_LOCALE;

    const setLocale = useCallback(
        async (nextLocale: SupportedLocale) => {
            saveLocalePreference(nextLocale);
            await i18n.changeLanguage(nextLocale);
        },
        [i18n]
    );

    return {
        locale,
        setLocale,
        localeDefinitions: LOCALE_DEFINITIONS,
        supportedLocales: SUPPORTED_LOCALES
    };
}

export { normalizeLocale };

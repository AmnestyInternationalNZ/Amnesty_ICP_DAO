import i18n from 'i18next';
import { commissionCatalog } from './commissionTranslations';
import { initReactI18next } from 'react-i18next';
import { resolveLocalePreference } from './preferences';
import { resources } from './resources';
import { DEFAULT_LOCALE, getLocaleDefinition, getLocaleDirection, normalizeLocale } from './types';

export function applyDocumentLocaleSettings(locale: string | null | undefined): void {
    if (typeof document === 'undefined') {
        return;
    }

    const supportedLocale = normalizeLocale(locale) ?? DEFAULT_LOCALE;
    const definition = getLocaleDefinition(supportedLocale);
    const root = document.documentElement;

    root.lang = definition.intlLocale;
    root.dir = getLocaleDirection(supportedLocale);
    root.dataset.locale = supportedLocale;
    root.dataset.localeEnglishName = definition.englishName;
}

void i18n.use(initReactI18next).init({
    resources: Object.fromEntries(Object.entries(resources).map(([locale, value]) => [locale, { ...value, commission: commissionCatalog(locale) }])),
    lng: resolveLocalePreference(),
    fallbackLng: DEFAULT_LOCALE,
    interpolation: {
        escapeValue: false
    }
}).then(() => {
    applyDocumentLocaleSettings(i18n.resolvedLanguage ?? i18n.language);
});

i18n.on('languageChanged', (locale) => applyDocumentLocaleSettings(locale));

export { i18n };

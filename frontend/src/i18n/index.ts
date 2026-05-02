import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resolveLocalePreference } from './preferences';
import { en } from './locales/en';

export const resources = {
    en: {
        translation: en
    }
} as const;

void i18n.use(initReactI18next).init({
    resources,
    lng: resolveLocalePreference(),
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false
    }
});

export { i18n };

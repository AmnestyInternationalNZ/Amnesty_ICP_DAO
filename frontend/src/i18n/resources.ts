import am from './locales/am.json';
import ar from './locales/ar.json';
import en from './locales/en.json';
import fa from './locales/fa.json';
import fr from './locales/fr.json';
import ko from './locales/ko.json';
import my from './locales/my.json';
import ru from './locales/ru.json';
import sw from './locales/sw.json';
import zhHans from './locales/zh-Hans.json';
import { reviewedLocaleOverrides } from './reviewedLocaleOverrides';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './types';

export type TranslationCatalog = typeof en;

export type DeepPartial<T> = T extends string
    ? string
    : T extends Array<infer U>
      ? Array<DeepPartial<U>>
      : T extends Record<string, unknown>
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;

const baseLocaleCatalogs: Record<SupportedLocale, TranslationCatalog> = {
    am,
    ar,
    en,
    fa,
    fr,
    ko,
    my,
    ru,
    sw,
    'zh-Hans': zhHans
};

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeCatalog<T>(base: T, override: DeepPartial<T> | undefined): T {
    if (override === undefined) {
        return base;
    }

    if (typeof base === 'string') {
        return (typeof override === 'string' ? override : base) as T;
    }

    if (Array.isArray(base)) {
        if (!Array.isArray(override)) {
            return base;
        }

        return base.map((item, index) => mergeCatalog(item, override[index] as DeepPartial<typeof item>)) as T;
    }

    if (isObject(base) && isObject(override)) {
        const merged: Record<string, unknown> = { ...base };
        for (const key of Object.keys(override)) {
            if (key in merged) {
                merged[key] = mergeCatalog(merged[key], override[key] as never);
            }
        }
        return merged as T;
    }

    return base;
}

export const translationCatalogs = SUPPORTED_LOCALES.reduce(
    (catalogs, locale) => {
        const baseCatalog = baseLocaleCatalogs[locale] ?? baseLocaleCatalogs[DEFAULT_LOCALE];
        catalogs[locale] = mergeCatalog(baseCatalog, reviewedLocaleOverrides[locale]);
        return catalogs;
    },
    {} as Record<SupportedLocale, TranslationCatalog>
);

export const resources = SUPPORTED_LOCALES.reduce(
    (resourceMap, locale) => {
        resourceMap[locale] = { translation: translationCatalogs[locale] };
        return resourceMap;
    },
    {} as Record<SupportedLocale, { translation: TranslationCatalog }>
);

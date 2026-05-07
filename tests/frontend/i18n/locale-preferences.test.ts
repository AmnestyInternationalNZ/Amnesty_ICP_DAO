import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyDocumentLocaleSettings } from '../../../frontend/src/i18n';
import { getIntlLocale, getLocaleDirection, normalizeLocale } from '../../../frontend/src/i18n/types';
import { resolveLocalePreference } from '../../../frontend/src/i18n/preferences';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('locale preferences', () => {
  it('normalizes supported browser and regional locale codes', () => {
    expect(normalizeLocale('fr-CA')).toBe('fr');
    expect(normalizeLocale('zh-CN')).toBe('zh-Hans');
    expect(normalizeLocale('fa-IR')).toBe('fa');
    expect(normalizeLocale('en-NZ')).toBe('en');
    expect(normalizeLocale('es')).toBeNull();
  });

  it('resolves saved, community, browser, and fallback preferences in order', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });

    expect(resolveLocalePreference({ communityLocale: 'ru', browserLanguages: ['fr-FR'] })).toBe('ru');
    store.set('amnesty.locale', 'ko');
    expect(resolveLocalePreference({ communityLocale: 'ru', browserLanguages: ['fr-FR'] })).toBe('ko');
    store.clear();
    expect(resolveLocalePreference({ browserLanguages: ['sw-KE'] })).toBe('sw');
    expect(resolveLocalePreference({ browserLanguages: ['es-ES'] })).toBe('en');
  });

  it('applies document language, direction, and data attributes for RTL locales', () => {
    const root = { dataset: {} as Record<string, string>, dir: '', lang: '' };
    vi.stubGlobal('document', { documentElement: root });

    applyDocumentLocaleSettings('ar');

    expect(root.lang).toBe('ar');
    expect(root.dir).toBe('rtl');
    expect(root.dataset.locale).toBe('ar');
    expect(getLocaleDirection('fa')).toBe('rtl');
    expect(getIntlLocale('zh-CN')).toBe('zh-Hans');
  });
});

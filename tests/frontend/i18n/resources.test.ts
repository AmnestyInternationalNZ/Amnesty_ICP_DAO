import { describe, expect, it } from 'vitest';
import { resources, translationCatalogs } from '../../../frontend/src/i18n/resources';
import { SUPPORTED_LOCALES } from '../../../frontend/src/i18n/types';

function flattenStrings(value: unknown, prefix: string[] = [], rows: Array<{ path: string; value: string }> = []) {
  if (typeof value === 'string') {
    rows.push({ path: prefix.join('.'), value });
    return rows;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenStrings(item, [...prefix, `[${index}]`], rows));
    return rows;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => flattenStrings(child, [...prefix, key], rows));
  }

  return rows;
}

function placeholders(value: string): string[] {
  return Array.from(new Set(value.match(/\{\{[^}]+\}\}/g) ?? [])).sort();
}

describe('i18n resources', () => {
  it('loads every supported locale into i18next resources', () => {
    expect(Object.keys(resources).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    expect(resources.fr.translation.app.nav.boards).toBeTruthy();
    expect(resources['zh-Hans'].translation.i18n.language.label).toBeTruthy();
  });

  it('keeps every translated catalog aligned to the English key and placeholder shape', () => {
    const englishRows = flattenStrings(translationCatalogs.en);
    const englishPaths = new Map(englishRows.map((row) => [row.path, row.value]));

    for (const locale of SUPPORTED_LOCALES) {
      const localeRows = flattenStrings(translationCatalogs[locale]);
      expect(localeRows.map((row) => row.path).sort()).toEqual([...englishPaths.keys()].sort());

      for (const row of localeRows) {
        expect(placeholders(row.value)).toEqual(placeholders(englishPaths.get(row.path) ?? ''));
      }
    }
  });
});

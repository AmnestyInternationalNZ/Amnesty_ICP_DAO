import { describe, expect, it } from 'vitest';
import {
  assertPlaceholderParity,
  flattenCatalog,
  parseCsv,
  parsePath,
  pathToString,
  stringifyCsv,
} from '../../../scripts/locale-spreadsheet-utils.mjs';

describe('locale spreadsheet utilities', () => {
  it('round-trips path values used by translator spreadsheets', () => {
    const segments = ['workspace', 'blocks', 0, 'title'];

    expect(pathToString(segments)).toBe('workspace.blocks[0].title');
    expect(parsePath('workspace.blocks[0].title')).toEqual(segments);
  });

  it('exports and parses CSV rows with commas, quotes, and line breaks', () => {
    const csv = stringifyCsv([
      ['Path', 'Current fr'],
      ['app.hero', 'Une phrase, avec "guillemets"\net retour'],
    ]);

    expect(parseCsv(csv)).toEqual([
      ['Path', 'Current fr'],
      ['app.hero', 'Une phrase, avec "guillemets"\net retour'],
    ]);
  });

  it('flattens catalogs and rejects placeholder drift', () => {
    const rows = flattenCatalog({ common: { byline: 'By {{name}}' } });

    expect(rows).toEqual([
      {
        key: 'byline',
        namespace: 'common',
        path: 'common.byline',
        segments: ['common', 'byline'],
        value: 'By {{name}}',
      },
    ]);
    expect(() => assertPlaceholderParity('By {{name}}', 'Par {{name}}', 'fr:common.byline')).not.toThrow();
    expect(() => assertPlaceholderParity('By {{name}}', 'Par name', 'fr:common.byline')).toThrow(
      /placeholder mismatch/,
    );
  });
});

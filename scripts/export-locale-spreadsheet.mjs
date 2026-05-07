#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  defaultSpreadsheetPath,
  extractPlaceholders,
  flattenCatalog,
  getAtPath,
  localeDefinitions,
  readBaseCatalogs,
  readReviewedOverrides,
  resolvedCatalogs,
  stringifyCsv,
} from './locale-spreadsheet-utils.mjs';

const outputPath = path.resolve(process.argv[2] ?? defaultSpreadsheetPath);
const baseCatalogs = readBaseCatalogs();
const catalogs = resolvedCatalogs(baseCatalogs, readReviewedOverrides());
const englishRows = flattenCatalog(catalogs.en);

const header = [
  'Namespace',
  'Key',
  'Path',
  'Placeholders',
  ...localeDefinitions.map((locale) => `Current ${locale.code}`),
  ...localeDefinitions.map((locale) => `Suggested ${locale.code}`),
  'Translator Notes',
  'Review Status',
];

const rows = [
  header,
  ...englishRows.map((row) => [
    row.namespace,
    row.key,
    row.path,
    extractPlaceholders(row.value).join('; '),
    ...localeDefinitions.map((locale) => getAtPath(catalogs[locale.code], row.segments) ?? ''),
    ...localeDefinitions.map(() => ''),
    '',
    '',
  ]),
];

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, stringifyCsv(rows));
console.log(`Exported ${englishRows.length} strings to ${outputPath}`);

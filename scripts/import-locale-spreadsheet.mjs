#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  assertPlaceholderParity,
  defaultSpreadsheetPath,
  extractPlaceholders,
  getAtPath,
  localeDefinitions,
  parseCsv,
  parsePath,
  readBaseCatalogs,
  readReviewedOverrides,
  resolvedCatalogs,
  setAtPath,
  writeReviewedOverrides,
} from './locale-spreadsheet-utils.mjs';

const inputPath = path.resolve(process.argv[2] ?? defaultSpreadsheetPath);
const rows = parseCsv(fs.readFileSync(inputPath, 'utf8'));
const [header, ...records] = rows;
const columnIndex = Object.fromEntries(header.map((name, index) => [name, index]));
const baseCatalogs = readBaseCatalogs();
const existingOverrides = readReviewedOverrides();
const catalogs = resolvedCatalogs(baseCatalogs, existingOverrides);
const nextOverrides = JSON.parse(JSON.stringify(existingOverrides));
const changed = [];

for (const record of records) {
  const pathValue = record[columnIndex.Path]?.trim();
  if (!pathValue) {
    continue;
  }

  const segments = parsePath(pathValue);
  const source = getAtPath(catalogs.en, segments);
  const expectedPlaceholders = (record[columnIndex.Placeholders] ?? '')
    .split(';')
    .map((placeholder) => placeholder.trim())
    .filter(Boolean)
    .sort();

  if (expectedPlaceholders.join('|') !== extractPlaceholders(source).join('|')) {
    throw new Error(`${pathValue} placeholder metadata is stale. Re-export the spreadsheet before importing.`);
  }

  for (const locale of localeDefinitions) {
    const suggestedColumn = `Suggested ${locale.code}`;
    const currentColumn = `Current ${locale.code}`;
    const suggestion = record[columnIndex[suggestedColumn]] ?? '';
    if (!suggestion.trim()) {
      continue;
    }

    const current = record[columnIndex[currentColumn]] ?? getAtPath(catalogs[locale.code], segments) ?? '';
    if (suggestion === current) {
      continue;
    }

    assertPlaceholderParity(source, suggestion, `${locale.code}:${pathValue}`);
    if (!nextOverrides[locale.code]) {
      nextOverrides[locale.code] = {};
    }
    setAtPath(nextOverrides[locale.code], segments, suggestion);
    changed.push(`${locale.code}:${pathValue}`);
  }
}

writeReviewedOverrides(nextOverrides);
console.log(`Imported ${changed.length} reviewed translation override${changed.length === 1 ? '' : 's'}.`);
if (changed.length > 0) {
  console.log(changed.map((item) => `- ${item}`).join('\n'));
}

#!/usr/bin/env node
import {
  assertPlaceholderParity,
  flattenCatalog,
  getAtPath,
  localeDefinitions,
  readBaseCatalogs,
  readReviewedOverrides,
  resolvedCatalogs,
} from './locale-spreadsheet-utils.mjs';

const catalogs = resolvedCatalogs(readBaseCatalogs(), readReviewedOverrides());
const englishRows = flattenCatalog(catalogs.en);
const englishPaths = new Set(englishRows.map((row) => row.path));
const failures = [];

for (const locale of localeDefinitions) {
  const rows = flattenCatalog(catalogs[locale.code]);
  const localePaths = new Set(rows.map((row) => row.path));

  for (const pathValue of englishPaths) {
    if (!localePaths.has(pathValue)) {
      failures.push(`${locale.code}:${pathValue} is missing`);
    }
  }

  for (const row of englishRows) {
    const candidate = getAtPath(catalogs[locale.code], row.segments);
    if (typeof candidate !== 'string') {
      failures.push(`${locale.code}:${row.path} is not a string`);
      continue;
    }

    try {
      assertPlaceholderParity(row.value, candidate, `${locale.code}:${row.path}`);
    } catch (error) {
      failures.push(error.message);
    }
  }
}

if (failures.length > 0) {
  console.error(`Locale check failed with ${failures.length} issue${failures.length === 1 ? '' : 's'}:`);
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log(`Locale check passed for ${localeDefinitions.length} locales and ${englishRows.length} strings.`);

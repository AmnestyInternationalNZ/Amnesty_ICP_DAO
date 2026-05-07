import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const repoRoot = path.resolve(__dirname, '..');
export const localeDir = path.join(repoRoot, 'frontend/src/i18n/locales');
export const reviewedOverridesPath = path.join(repoRoot, 'frontend/src/i18n/reviewedLocaleOverrides.ts');
export const defaultSpreadsheetPath = path.join(repoRoot, 'docs/localization/site-copy-review-all-locales.csv');

export const localeDefinitions = [
  { code: 'en', englishName: 'English', nativeName: 'English' },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية' },
  { code: 'fr', englishName: 'French', nativeName: 'Français' },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский' },
  { code: 'zh-Hans', englishName: 'Mandarin Chinese', nativeName: '简体中文' },
  { code: 'my', englishName: 'Burmese', nativeName: 'မြန်မာ' },
  { code: 'fa', englishName: 'Persian (Farsi)', nativeName: 'فارسی' },
  { code: 'sw', englishName: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'am', englishName: 'Amharic', nativeName: 'አማርኛ' },
  { code: 'ko', englishName: 'Korean', nativeName: '한국어' },
];

export const supportedLocales = localeDefinitions.map((locale) => locale.code);

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function readBaseCatalogs() {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, readJson(path.join(localeDir, `${locale}.json`))])
  );
}

export function readReviewedOverrides() {
  if (!fs.existsSync(reviewedOverridesPath)) {
    return {};
  }

  const source = fs.readFileSync(reviewedOverridesPath, 'utf8');
  const assignmentIndex = source.indexOf('reviewedLocaleOverrides');
  const objectStart = source.indexOf('{', assignmentIndex);
  if (assignmentIndex === -1 || objectStart === -1) {
    return {};
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = objectStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(source.slice(objectStart, index + 1));
      }
    }
  }

  throw new Error(`Could not parse ${reviewedOverridesPath}`);
}

export function writeReviewedOverrides(overrides) {
  const sorted = sortDeep(pruneEmpty(overrides));
  const body = JSON.stringify(sorted, null, 2);
  fs.writeFileSync(
    reviewedOverridesPath,
    `import type { SupportedLocale } from './types';\n` +
      `import type { DeepPartial, TranslationCatalog } from './resources';\n\n` +
      `export const reviewedLocaleOverrides = ${body} as Partial<Record<SupportedLocale, DeepPartial<TranslationCatalog>>>;\n`
  );
}

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function mergeDeep(base, override) {
  if (override === undefined) {
    return base;
  }

  if (typeof base === 'string') {
    return typeof override === 'string' ? override : base;
  }

  if (Array.isArray(base)) {
    if (!Array.isArray(override)) {
      return base;
    }
    return base.map((item, index) => mergeDeep(item, override[index]));
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const merged = { ...base };
    for (const [key, value] of Object.entries(override)) {
      if (key in merged) {
        merged[key] = mergeDeep(merged[key], value);
      }
    }
    return merged;
  }

  return base;
}

export function resolvedCatalogs(baseCatalogs = readBaseCatalogs(), overrides = readReviewedOverrides()) {
  return Object.fromEntries(
    supportedLocales.map((locale) => [locale, mergeDeep(baseCatalogs[locale], overrides[locale])])
  );
}

export function pathToString(segments) {
  return segments
    .map((segment, index) => {
      if (typeof segment === 'number') {
        return `[${segment}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
}

export function parsePath(pathValue) {
  const segments = [];
  const regex = /([^[.\]]+)|\[(\d+)\]/g;
  let match;
  while ((match = regex.exec(pathValue))) {
    segments.push(match[1] ?? Number(match[2]));
  }
  return segments;
}

export function getAtPath(root, segments) {
  return segments.reduce((cursor, segment) => cursor?.[segment], root);
}

export function setAtPath(root, segments, value) {
  let cursor = root;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    if (cursor[segment] === undefined) {
      cursor[segment] = typeof nextSegment === 'number' ? [] : {};
    }
    cursor = cursor[segment];
  }
  cursor[segments[segments.length - 1]] = value;
}

export function flattenCatalog(value, prefix = [], rows = []) {
  if (typeof value === 'string') {
    rows.push({
      key: String(prefix.at(-1) ?? ''),
      namespace: String(prefix[0] ?? ''),
      path: pathToString(prefix),
      segments: prefix,
      value,
    });
    return rows;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenCatalog(item, [...prefix, index], rows));
    return rows;
  }

  if (isPlainObject(value)) {
    Object.keys(value)
      .sort()
      .forEach((key) => flattenCatalog(value[key], [...prefix, key], rows));
  }

  return rows;
}

export function extractPlaceholders(value) {
  return Array.from(new Set(String(value).match(/\{\{[^}]+\}\}/g) ?? [])).sort();
}

export function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function stringifyCsv(rows) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n') + '\n';
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

export function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.keys(value)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = sortDeep(value[key]);
      return sorted;
    }, {});
}

export function pruneEmpty(value) {
  if (Array.isArray(value)) {
    return value.map(pruneEmpty);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((result, [key, child]) => {
    const prunedChild = pruneEmpty(child);
    if (
      prunedChild !== undefined &&
      !(isPlainObject(prunedChild) && Object.keys(prunedChild).length === 0) &&
      !(Array.isArray(prunedChild) && prunedChild.length === 0)
    ) {
      result[key] = prunedChild;
    }
    return result;
  }, {});
}

export function assertPlaceholderParity(source, candidate, context) {
  const expected = extractPlaceholders(source);
  const actual = extractPlaceholders(candidate);
  if (expected.join('|') !== actual.join('|')) {
    throw new Error(
      `${context} placeholder mismatch. Expected ${expected.join(', ') || 'none'}, received ${actual.join(', ') || 'none'}`
    );
  }
}

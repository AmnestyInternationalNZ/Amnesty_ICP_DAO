# Amnesty DAO Translation Review Workflow

This project supports English, Arabic, French, Russian, Mandarin Chinese, Burmese, Persian (Farsi), Swahili, Amharic, and Korean.

The current non-English copy is preliminary machine translation. Treat it as a starting point for reviewer editing, not final publication-quality copy.

## Export Copy For Review

Run:

```sh
pnpm run extract:locale-spreadsheet
```

This writes:

```text
docs/localization/site-copy-review-all-locales.csv
```

The spreadsheet includes:

- `Namespace`, `Key`, and `Path` so each string can be traced back to the app.
- `Placeholders` for variables such as `{{name}}` or `{{count}}`.
- `Current <locale>` columns with the currently shipped text.
- `Suggested <locale>` columns where reviewers should place edits.
- `Translator Notes` and `Review Status` for team workflow.

## Review Rules

- Edit only `Suggested <locale>` cells.
- Keep all placeholders exactly as shown in `Placeholders`.
- Leave a `Suggested <locale>` cell blank if no change is needed.
- Use `Review Status` values such as `needs-review`, `approved`, or `blocked`.
- Use `Translator Notes` for context, tone questions, or legal/policy concerns.

## Import Reviewed Copy

After the team updates the CSV, run:

```sh
pnpm run import:locale-spreadsheet
pnpm run check:locales
```

The import writes approved suggestions into:

```text
frontend/src/i18n/reviewedLocaleOverrides.ts
```

That file is intentionally sparse: only human-reviewed changes are stored there. The app merges those reviewed overrides over the machine-translated base catalogs at runtime.

## Ship Checklist

Run the normal frontend verification after importing reviewed copy:

```sh
pnpm exec tsc -p frontend/tsconfig.json --noEmit
pnpm run test:frontend
pnpm run build
```

For Arabic and Persian, do a browser pass to confirm RTL layout, header navigation, workspace screens, boards, calendar, and modals still feel usable.

# Odin Financial Lens

A lightweight financial-statement reader for private-market workflows. Upload one Excel/CSV statement for a quick rundown; optionally add one more statement to compare metrics and trend charts side by side.

## Product flow

1. Upload or paste **Statement 1**.
2. Review the quick rundown: growth, margins, runway, debt/cash pressure, trend charts, and follow-up questions.
3. Optionally add **Statement 2**.
4. Compare normalized metrics and charts side by side.

The app intentionally caps comparison at two statements to keep the MVP focused and easy to use.

## Supported inputs

- `.xlsx`, `.xls`, `.csv`, `.tsv`, `.txt`
- Pasted table/CSV text
- Common wide statement layouts: metrics down the left, periods across the top
- Common aliases: `Sales` / `Revenue`, `Adjusted EBITDA` / `EBITDA`, `Cash Balance` / `Cash`, `Borrowings` / `Debt`, `Net Burn` / `Burn`

## Test workbooks

- `odin-financial-statement-a.xlsx`
- `odin-financial-statement-b.xlsx`

These are intentionally normal single-statement workbooks, not multi-company templates.

## Local development

```bash
pnpm install
pnpm run dev
```

## Test and build

```bash
pnpm run test
pnpm run build
pnpm run preview
```

## GitHub / Codespaces deployment

This repo is ready to publish outside Aime:

1. Create a new GitHub repository.
2. Push this project folder to GitHub.
3. Open it in GitHub Codespaces if you want to demo or edit live.
4. For GitHub Pages, enable **Settings → Pages → GitHub Actions**.
5. Push to `main`; `.github/workflows/deploy.yml` builds and publishes `dist`.

Because the Vite build uses relative asset paths, the static site works under GitHub Pages project paths.

## Safety stance

This is analysis assistance, not valuation, legal, tax, accounting, or investment advice. It highlights signals and follow-up questions from the uploaded sheet. A human should validate definitions, accounting treatment, and source data before making decisions.

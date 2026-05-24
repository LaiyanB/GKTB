# Guangdong Admissions Guide · REASONIX.md

## Stack

- **React 19 + Vite** — SPA frontend, JSX, no TypeScript.
- **lucide-react** — icon library.
- **xlsx** — Excel workbook parsing in Node scripts.
- **hosted on static file server** — offline data served from `/data/*.json`.

## Layout

| Path | Purpose |
|------|---------|
| `src/` | React app source (JSX, hooks, utils, CSS) |
| `data/raw/` | Source Excel workbooks (university admission scores, segment tables) |
| `data/normalized/` | Cleaned JSON emitted by pipeline scripts |
| `public/data/` | JSON served to the browser at `/data/*.json` |
| `scripts/` | Node.js ESM scripts: normalize, map, summarize, inspect workbooks |
| `docs/` | Data schema and prediction model design docs |

## Commands

| Command | Action |
|---------|--------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build via Vite |
| `npm run preview` | Preview the production build |
| `npm run inspect:data` | Inspect raw Excel workbooks |
| `npm run normalize:data` | Normalize raw Excel → `data/normalized/*.json` |
| `npm run map:data` | Map/merge admissions records |
| `npm run generate:summary` | Generate school summary from normalized data |

## Data pipeline (in order)

`inspect:data` → `normalize:data` → `map:data` → `generate:summary` — each script reads the output of the previous step. A CI workflow (`.github/workflows/data-pipeline.yml`) runs all four, then copies results to `public/data/` and commits them.

## Conventions

- **Named exports only** — no `export default` in source (exception: `App` is a default export).
- **Chinese-language codebase** — UI strings, data, and doc comments in Chinese; variable/function names in English.
- **Component file per component** — `*.jsx` files under `src/components/`.
- **`.mjs` extension for Node scripts** — disambiguates from browser JSX.
- **`启动应用.bat`** on Windows to start dev server with Chinese codepage + `--open`.

## Watch out for

- **No TypeScript, no tests, no linter/formatter** — none configured. Add manually if needed.
- **`data/normalized/` is generated** — do not edit by hand. Edit the pipeline scripts and re-run.
- **`public/data/` is copied from `data/normalized/`** by CI — if you change normalized files locally, copy them over manually to see changes in dev.
- **`package.json` uses `"latest"` for all deps** — builds may break when Vite/React publish breaking changes. Pin versions if stability is needed.

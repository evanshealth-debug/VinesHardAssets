# Vines Value Converter

A Vite, React, and TypeScript dashboard for comparing the estimated value of Unit 21/55 The Vines Drive, Normanville SA 5204 against gold, silver, Bitcoin, and butchered Black Angus beef.

## Framework

- Framework preset: `Vite`
- Frontend: React 18 + TypeScript
- Backend: none
- Supabase: not used in this rebuilt app
- Live quote source: client-side requests to Gold API

## Project Port

- Fixed local port: `3003`
- Host binding: `127.0.0.1`
- Reason: this is a UI project in the `3001-3010` range, and `3001` / `3002` were already in use when the app was created.

Before starting the local server, check the port:

```bash
lsof -nP -iTCP:3003 -sTCP:LISTEN
```

## Local Install

Install dependencies inside this folder only:

```bash
npm install
```

No global installs are required.

## Local Run

Start the dev server:

```bash
npm run dev
```

The app will run at:

```text
http://127.0.0.1:3003/
```

Equivalent explicit startup command:

```bash
npm run dev -- --host 127.0.0.1 --port 3003 --strictPort
```

Stop the server with `Ctrl+C` in the terminal running Vite. If `3003` is occupied, inspect the process with the `lsof` command above and do not kill another process unless you know it belongs to this project.

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Environment Variables

Copy `.env.example` to `.env` for local development if you want to override defaults.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_GOLD_API_BASE` | No | Public quote API base. Defaults to `https://api.gold-api.com`. |
| `PORT` | No | Local Vite dev/preview port. Defaults to `3003`. |
| `VITE_DEV_PORT` | No | Local fallback port used by `vite.config.ts`. Defaults to `3003`. |

No secret API keys are required. If Supabase is added later, expose only publishable browser variables such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

## Data Sources

- Live gold, silver, and Bitcoin AUD rates are fetched from `https://api.gold-api.com/price/{symbol}/AUD`.
- Supported symbols used here: `XAU`, `XAG`, and `BTC`.
- Quotes refresh on load, every 60 seconds while the tab is visible, on window focus, and when the refresh button is pressed.
- If one quote fails, the app keeps that asset's previous quote while updating the others.
- Seed history was copied from the original Lovable app's public history table on 2026-05-12.
- New snapshots are stored in browser local storage and can be exported to CSV.

## Vercel Deployment

When importing the GitHub repo into Vercel, use these settings:

- Root Directory: `vines-value-converter`
- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Optional Vercel environment variable:

```text
VITE_GOLD_API_BASE=https://api.gold-api.com
```

The included `vercel.json` rewrites all routes to `index.html` so the `/history` React route works on refresh.

## GitHub Deployment Steps

1. Push this project to GitHub without `node_modules`, `dist`, `.env`, spreadsheets, private files, or secrets.
2. In Vercel, choose `Add New Project` and import the GitHub repository.
3. Set the root directory to `vines-value-converter` if this folder is inside a larger repository.
4. Confirm the Vercel settings listed above.
5. Add only the optional public environment variable if you want to override the quote API base.
6. Deploy.

## Repository Hygiene

The `.gitignore` excludes local dependencies, builds, environment files, logs, private folders, and spreadsheet-style data files. Keep private valuations, spreadsheets, personal files, and secret credentials outside the repository.

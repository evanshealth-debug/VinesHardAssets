# VinesHardAssets

A public deployment repository for the Vines property hard-asset dashboard.

The application lives in [`vines-value-converter`](./vines-value-converter). It compares the estimated value of Unit 21/55 The Vines Drive, Normanville SA 5204 against live AUD-denominated gold, silver, Bitcoin, and a butchered Black Angus beef assumption.

## Vercel Settings

Recommended settings if you keep the app in its current subfolder:

- Root Directory: `vines-value-converter`
- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

The repository also includes root-level `package.json` and `vercel.json` files so a Vercel project pointed at the repository root can still build the app:

- Root Directory: leave blank
- Framework Preset: `Other`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `vines-value-converter/dist`

Optional environment variable:

```text
VITE_GOLD_API_BASE=https://api.gold-api.com
```

No Supabase backend or private API key is required.

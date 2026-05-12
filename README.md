# VinesHardAssets

A public deployment repository for the Vines property hard-asset dashboard.

The application lives in [`vines-value-converter`](./vines-value-converter). It compares the estimated value of Unit 21/55 The Vines Drive, Normanville SA 5204 against live AUD-denominated gold, silver, Bitcoin, and a butchered Black Angus beef assumption.

## Vercel Settings

- Root Directory: `vines-value-converter`
- Framework Preset: `Vite`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Optional environment variable:

```text
VITE_GOLD_API_BASE=https://api.gold-api.com
```

No Supabase backend or private API key is required.

# Been There. Done That.

A premium, light, map-first personal travel scrapbook built with Next.js App Router.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## What V1 Includes

- Light blush editorial UI with desktop-first responsive layout.
- Navigation: `Map`, `Places`, `Gallery`, `Settings`.
- First-launch mock sign-in gate that persists locally.
- Add Place flow with searchable country and city selectors + manual city fallback.
- Data model: `Country -> City -> Memory Entries`.
- Multiple dated memory entries per city (`YYYY-MM`).
- Optional memory descriptions and optional photo uploads.
- Interactive world map with clear visited vs unvisited states.
- Seeded starter place:
  - Country: United States
  - City: Phoenix
  - Region: Arizona
  - One memory entry, no photos
- Global gallery and city detail timeline views.
- Settings page with session controls and JSON export/import backup.

## Storage in V1

V1 supports two storage modes:

- **Supabase mode** (active automatically when both env vars are present):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Uses Supabase Auth (anonymous sign-in), Postgres tables, and `memory-photos` Storage bucket.
- **Local mode** fallback (when env vars are not set):
  - Uses IndexedDB (Dexie) in the browser.

## Supabase Setup Notes

- Enable **Anonymous sign-ins** in Supabase Auth settings.
- Run the SQL schema/policy script in Supabase SQL Editor before testing.
- Add both `NEXT_PUBLIC_*` vars in Vercel Project Settings and redeploy.

## Limitations of Local Mode

- Data does not sync between devices.
- Data can be lost if browser storage is cleared.
- Private/incognito modes may not persist data reliably.
- Importing a backup replaces current local scrapbook data.

Use **Export Data** regularly from Settings for safety.

## Architecture Notes

Storage is abstracted behind `storage/adapter.ts`.
Active adapter is selected in `storage/index.ts`:

- `storage/supabase-adapter.ts` when Supabase env vars exist
- `storage/local-adapter.ts` otherwise

This keeps the UI layer independent from persistence details and makes migration easier.

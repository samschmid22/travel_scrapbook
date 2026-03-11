# Been There. Done That.

A premium, light, map-first personal travel scrapbook built with Next.js App Router.

## Run Locally

```bash
npm install --legacy-peer-deps
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

V1 uses **IndexedDB (Dexie)** in the browser.

- Cities, memory entries, session state, and uploaded image blobs are stored locally.
- Data persists across refreshes in the same browser profile/device.
- No environment variables are required.

## Limitations of Local Browser Storage

- Data does not sync between devices.
- Data can be lost if browser storage is cleared.
- Private/incognito modes may not persist data reliably.
- Importing a backup replaces current local scrapbook data.

Use **Export Data** regularly from Settings for safety.

## Architecture Notes

Storage is abstracted behind `storage/adapter.ts`.
The active implementation is `storage/local-adapter.ts` (Dexie).

This keeps the UI layer independent from persistence details and makes migration easier.

## Future Supabase Path

A Supabase integration can be added by implementing another storage adapter and swapping the export in `storage/index.ts`.

Potential migration steps:

1. Add Supabase auth and replace mock session methods.
2. Move city/memory/photo persistence to Supabase tables + storage buckets.
3. Keep the same app hooks/components and change only adapter logic.
4. Add cloud sync and optional multi-device conflict handling.

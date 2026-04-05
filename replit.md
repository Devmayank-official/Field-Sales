# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/db` for validation (drizzle-zod schemas) and persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts all sub-routers
  - `health.ts` — `GET /api/healthz`
  - `clients.ts` — full CRUD (`GET /api/clients?status=&isArchived=&search=`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`)
  - `fridges.ts` — full CRUD (`GET /api/fridges?clientId=`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`)
  - `visits.ts` — `GET /api/visits?clientId=`, `POST`, `GET /:id`, `PUT /:id`
  - `reminders.ts` — `GET /api/reminders?clientId=`, `POST`, `PUT /:id`, `DELETE /:id`
  - `sync.ts` — `POST /api/sync/push` (bulk upsert from device), `GET /api/sync/pull?since=<ms>` (changes since timestamp)
- Validation uses drizzle-zod `insertXxxSchema` from `@workspace/db` — no hand-written Zod
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.mjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/field-sales` (`@workspace/field-sales`)

100% offline-first Field Sales & Asset Intelligence App (Coca-Cola). Built with React + Vite + Tailwind v4, Dexie.js (IndexedDB), Zustand, TanStack Query, shadcn/ui, framer-motion, wouter. **Being converted to Capacitor iOS/Android native app.**

**Features implemented:**
- Client CRUD with full status pipeline (Lead → Contacted → Active → High Value → Inactive)
- Visit frequency & monthly value estimate fields per client
- Asset/Fridge tracking with GCC codes, serial numbers, QR code values, condition statuses
- Visit workflow with GPS capture, live timer, fridge audit checklist, follow-up outcomes
- Photo capture per client/asset/visit with canvas compression → base64 → IndexedDB storage
- Global search (clients + fridges by name, phone, GCC, serial, pincode, email, tags)
- Dashboard with rule-based alerts (overdue visits, critical fridges)
- Dark mode toggle persisted to localStorage + native StatusBar sync
- PWA (vite-plugin-pwa) with service worker + offline caching
- JSON export/import backup + CSV export (clients, assets, visits as separate files)
- Sample data seeding (hidden in production builds)
- FAB speed-dial menu with contextual actions (New Client, etc.)
- Global top App Bar with branding + profile avatar link
- Profile CRUD in Settings — name, role, phone, email, territory persisted to localStorage
- All destructive actions use proper modal dialogs (no native confirm())
- QR Code scanner using camera + jsqr (web) / ML Kit (native)
- Swipe-to-complete / swipe-to-delete on reminder cards (Framer Motion)
- PIN lock screen + biometric (FaceID/TouchID/WebAuthn) with haptic feedback
- Local notifications for reminders — OS-level on native, setTimeout on web

**Capacitor Integration (Phase 0 + Phase 1 complete):**
- `capacitor.config.ts` — app config (appId: com.fieldsales.app, webDir: dist/public)
- Build scripts: `pnpm build:native`, `pnpm sync:ios`, `pnpm sync:android`
- Abstraction layer in `src/lib/native/` — all native plugins with web fallbacks:
  - `haptics.ts` — @capacitor/haptics (replaces lib/haptic.ts; iOS finally vibrates)
  - `biometric.ts` — capacitor-native-biometric + WebAuthn fallback
  - `secureStorage.ts` — capacitor-secure-storage-plugin (PIN in keychain)
  - `geolocation.ts` — @capacitor/geolocation with requestPermissions()
  - `notifications.ts` — @capacitor/local-notifications + setTimeout fallback
  - `camera.ts` — @capacitor/camera with dataUrl→File conversion
  - `scanner.ts` — @capacitor-mlkit/barcode-scanning + jsqr fallback
- App.tsx: `@capacitor/app` appStateChange for reliable lock-on-background; SplashScreen.hide() on ready; StatusBar sync with dark mode
- All imports updated from `@/lib/haptic` → `@/lib/native/haptics` across entire codebase

**Capacitor Integration (Phase 2 — Nice to Have — complete):**
- `src/lib/native/preferences.ts` → `@capacitor/preferences` Zustand async storage adapter (uiStore persists to native keychain-backed preferences, not just localStorage)
- `src/lib/native/filesystem.ts` → `@capacitor/filesystem` + `@capacitor/share` — `saveAndShare()` writes file to Cache dir + opens OS share sheet on native; triggers blob download on web
- `src/lib/native/network.ts` → `@capacitor/network` + web online/offline events — `useNetworkStatus()` hook drives offline banner
- `src/lib/native/filePicker.ts` → `@capawesome/capacitor-file-picker` — native file picker for JSON/CSV import; web falls through to hidden `<input>`
- `src/lib/native/share.ts` → `@capacitor/share` — `shareText()` opens OS share sheet; falls back to Web Share API / clipboard
- `src/lib/native/clipboard.ts` → `@capacitor/clipboard` — `copyToClipboard()` replaces `navigator.clipboard.writeText` everywhere
- `src/lib/native/badge.ts` → `@capawesome/capacitor-badge` — `setAppBadge(count)` sets app icon badge for overdue reminders; silently ignored on web
- `src/lib/native/appLauncher.ts` → `@capacitor/app-launcher` — `openMapsNavigation(address)` opens Apple Maps (iOS) / Google Maps
- `src/components/layout/NetworkBanner.tsx` — animated amber banner shown when offline; added to AppShell between active-visit banner and main content
- `@capacitor/keyboard` — `setAccessoryBarVisible(false)` called on native app start; resize behavior set to "body" in capacitor.config.ts
- **Settings page:** export now uses `saveAndShare` (native share sheet) / blob download (web); import uses native file picker / hidden `<input>` (web)
- **AppShell:** badge count synced from `overdueCount` via `useEffect` → `setAppBadge()`
- **client-detail:** Share button in header; Navigate button next to address (opens Maps); phone number copy icon
- **fridge-detail:** Serial number copy icon; QR copy upgraded to native clipboard
- **active-visit:** Share Summary button on completed visit screen

**To build native (requires Mac/Xcode for iOS, Android Studio for Android):**
```bash
cd Sales-Management/artifacts/field-sales
pnpm sync:ios      # builds + syncs to Xcode project
pnpm sync:android  # builds + syncs to Android Studio project
pnpm open:ios      # opens Xcode
pnpm open:android  # opens Android Studio
```

**Key files:**
- `src/lib/schema.ts` — Zod schemas + TypeScript types
- `src/lib/native/` — Capacitor abstraction layer (haptics, biometric, secureStorage, geolocation, notifications, camera, scanner)
- `src/services/db/dexieDb.ts` — Dexie v4 DB (v4 adds `_dirty` index on all tables for sync tracking) + seed data
- `src/services/repositories/` — clientRepo, fridgeRepo, visitRepo, imageRepo, reminderRepo (all set `_dirty: true` on create/update)
- `src/services/syncService.ts` — offline-first sync: `runSync()` pushes dirty records to `/api/sync/push`, pulls server changes via `/api/sync/pull?since=<ms>`, marks records clean; `getDirtyCount()` counts pending
- `src/hooks/useSyncStatus.ts` — React hook: tracks `state` (synced/pending/syncing/offline/error), `pendingCount`, `lastSyncAt`; auto-syncs on online event + every 60s
- `src/hooks/` — useClients, useFridges, useVisits, useImages, useReminders (with notification scheduling)
- `src/store/uiStore.ts` — Zustand store (dark mode, lock state, profile; PIN also written to secureStorage)
- `src/pages/` — dashboard, clients, client-detail, fridge-detail, active-visit, search, settings, reminders
- `src/components/forms/` — ClientForm, FridgeForm (with QR scanner)
- `src/components/layout/AppShell.tsx` — global layout: top bar (with SyncBadge), FAB menu, bottom nav
- `src/components/layout/SyncBadge.tsx` — sync status badge in top bar: "Synced" / "N pending" / "Syncing…" / "Offline" / "Sync error"; tap to trigger manual sync
- `src/components/layout/LockScreen.tsx` — PIN + biometric lock screen
- `src/components/ui/qr-scanner.tsx` — native ML Kit scanner (native) / jsqr (web)
- `src/components/ui/image-capture.tsx` — native camera (native) / file input (web)
- `src/components/ui/image-gallery.tsx` — grid gallery with lightbox

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

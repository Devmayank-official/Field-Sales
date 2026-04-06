# FieldSales — Field Sales & Asset Intelligence Platform

> A mobile-first, offline-first field sales management system built for Coca-Cola sales representatives.
> Manage clients, track refrigeration assets, log visits, capture photos, and sync to a cloud backend — with or without an internet connection.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Technology Stack](#technology-stack)
- [Core Features](#core-features)
- [Data Model](#data-model)
- [Offline-First Sync Architecture](#offline-first-sync-architecture)
- [Capacitor Plugin Inventory](#capacitor-plugin-inventory)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running in Development](#running-in-development)
- [Native Android Build](#native-android-build)
- [Production Deployment](#production-deployment)
- [Security Considerations](#security-considerations)
- [Roadmap](#roadmap)

---

## Overview

FieldSales is a production-grade Progressive Web App (PWA) with Capacitor-powered native Android/iOS packaging. It is designed for field sales representatives who operate in environments with unreliable or no internet connectivity.

All data is stored locally on the device using IndexedDB (via Dexie.js) and synced to a PostgreSQL backend when connectivity is available. The sync engine operates silently in the background and surfaces status to the user through a persistent badge in the application header.

**Primary use cases:**

| Use Case | Description |
|---|---|
| Client Management | Full CRUD for outlets — name, address, shop type, status, tags, color labels, visit frequency |
| Fridge Asset Tracking | Register, inspect, and photograph refrigeration units per client — serial number, GCC code, QR code, condition |
| Visit Logging | Log sales visits with GPS coordinates, photos, checklist outcomes, and free-form notes |
| Reminder Scheduling | Set and receive local push notifications for scheduled follow-up visits |
| Barcode / QR Scanning | Scan fridge serial number barcodes and asset QR codes via camera |
| Offline Operation | Full read/write capability with zero internet dependency; sync queues dirty records |
| Biometric PIN Lock | App-level PIN lock backed by device biometrics (fingerprint / face unlock) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Device                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              React 19 + Vite 7 (PWA / Capacitor)            │   │
│  │                                                              │   │
│  │   Pages         Zustand Store       TanStack Query           │   │
│  │   (wouter)      (UI state)          (server cache)           │   │
│  │                                                              │   │
│  │   Repository Layer (clients / fridges / visits / reminders)  │   │
│  │                                                              │   │
│  │   Dexie.js v4 ─── IndexedDB (local-first storage)           │   │
│  │                         │                                    │   │
│  │   Sync Service ─────────┘  (_dirty flag queue)              │   │
│  └──────────────────────────────────────┬───────────────────────┘   │
│                                         │  HTTPS (when online)      │
│  ┌──────────────────────────────────────▼───────────────────────┐   │
│  │              Capacitor Native Layer (Android / iOS)          │   │
│  │   Camera · Geolocation · Notifications · Biometric           │   │
│  │   Secure Storage · File System · Barcode Scanner · Share     │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                          HTTPS REST API
                                  │
┌─────────────────────────────────▼───────────────────────────────────┐
│                         API Server (Express)                        │
│                                                                     │
│   REST Routes: /clients  /fridges  /visits  /reminders              │
│   Sync Routes: POST /sync/push   GET /sync/pull                     │
│                                                                     │
│   Drizzle ORM ──────────────────────────────── PostgreSQL           │
│   drizzle-zod validation (no hand-written schemas)                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Key architectural decisions

| Decision | Rationale |
|---|---|
| **Dexie.js over `@capacitor-community/sqlite`** | Works identically on PWA and native without a WASM bundle. No repository rewrites needed. All 5 data repositories share one code path |
| **Last-write-wins sync** | Sufficient for V1 single-agent use. `updatedAt` timestamp is the conflict resolver. No CRDTs required |
| **Photos NOT synced to server** | Base64 images stored in IndexedDB only. Syncing to the server would require an object storage service (S3/GCS) and is deferred to V2 |
| **`androidScheme: "https"`** | All WebView requests use HTTPS internally. No `@capacitor/http` plugin needed — native `fetch()` works correctly |
| **Drizzle-Zod for validation** | Schemas are derived directly from the database definition. No duplicate Zod schemas to maintain |

---

## Monorepo Structure

This project is a pnpm workspace monorepo.

```
workspace/
├── artifacts/
│   ├── field-sales/          # @workspace/field-sales — React PWA / Capacitor app
│   │   ├── src/
│   │   │   ├── components/   # UI components (forms/, layout/, ui/)
│   │   │   ├── hooks/        # React hooks (useSyncStatus, etc.)
│   │   │   ├── lib/
│   │   │   │   ├── native/   # Capacitor plugin abstractions (16 modules)
│   │   │   │   └── schema.ts # Frontend TypeScript types
│   │   │   ├── pages/        # Route-level page components (9 pages)
│   │   │   ├── services/
│   │   │   │   ├── db/       # Dexie database + 5 repository modules
│   │   │   │   └── syncService.ts
│   │   │   └── store/        # Zustand stores
│   │   └── capacitor.config.ts
│   │
│   └── api-server/           # @workspace/api-server — Express REST API
│       └── src/
│           └── routes/       # clients, fridges, visits, reminders, sync, health
│
├── lib/
│   ├── db/                   # @workspace/db — Drizzle schema + migrations
│   │   └── src/schema/       # clients, fridges, visits, images, reminders, enums
│   ├── api-spec/             # @workspace/api-spec — OpenAPI specification
│   ├── api-zod/              # @workspace/api-zod — Generated Zod validators
│   └── api-client-react/     # @workspace/api-client-react — Generated React Query hooks
│
├── ANDROID_BUILD.md          # Full CLI Android native build guide (Linux)
├── README.md                 # This file
└── pnpm-workspace.yaml
```

---

## Technology Stack

### Frontend (`artifacts/field-sales`)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 19.1.0 | UI rendering |
| Build Tool | Vite | 7.x | Dev server, bundler |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| Component Library | Radix UI + shadcn/ui | Latest | Accessible headless components |
| Routing | wouter | 3.x | Lightweight client-side routing |
| Server State | TanStack Query | 5.x | Data fetching, caching, invalidation |
| Client State | Zustand | 5.x | Lightweight global UI state |
| Local Database | Dexie.js | 4.x | IndexedDB wrapper (offline storage) |
| Animations | Framer Motion | 12.x | Page transitions, micro-interactions |
| Icons | Lucide React | 0.5x | Icon set |
| Forms | React Hook Form + Zod | Latest | Form validation |
| Native Wrapper | Capacitor | 8.3.0 | iOS/Android native packaging |

### Backend (`artifacts/api-server`)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 24.x | Server runtime |
| Framework | Express | 4.x | HTTP server |
| ORM | Drizzle ORM | 0.45.x | Type-safe SQL query builder |
| Validation | drizzle-zod | Latest | Schema-derived Zod validators |
| Database | PostgreSQL | 16 | Cloud relational database |
| Migrations | drizzle-kit | Latest | Schema push/migrate CLI |

### Shared Libraries

| Package | Purpose |
|---|---|
| `@workspace/db` | Drizzle schema, table types, insert schemas — single source of truth |
| `@workspace/api-spec` | OpenAPI 3.x specification |
| `@workspace/api-zod` | Zod validators generated from the OpenAPI spec |
| `@workspace/api-client-react` | TanStack Query hooks generated from the OpenAPI spec |

---

## Core Features

### Client Management
- Full outlet profile: name, phone, email, address, sub-address, pincode
- Shop type classification and status lifecycle: `Lead → Contacted → Active → High Value → Inactive`
- Tag system with color labels (Red, Blue, Green, Yellow, Purple) for visual organisation
- Visit frequency target and monthly value estimate
- Archive clients without deleting records
- Deep search across name, phone, address, and tags

### Fridge Asset Tracking
- Register refrigeration units against a client
- Fields: serial number, GCC code, QR code value, condition (`Good / Fair / Needs Repair / Out of Service`)
- Photo capture with installation date and last inspection date
- Barcode / QR scanning via camera (powered by Google MLKit)
- Share or copy serial numbers and GCC codes directly to clipboard or OS share sheet

### Visit Logging
- Log a visit with GPS-verified location capture
- Photo attachments (stored locally in IndexedDB as base64)
- Checklist outcome recording and free-form notes
- Active visit workflow with timer
- Visit history per client

### Reminders & Notifications
- Schedule local push notifications for future visits
- Notifications survive app closure (delivered by the OS)
- Android exact alarm support (API < 33)

### Offline Sync
- All data mutations (create / update) mark records with a `_dirty: true` flag
- On network reconnect and every 60 seconds, the sync service pushes dirty records to the server
- Pulls server changes since last sync timestamp
- Sync status visible in app header: Synced / N pending / Syncing / Offline / Error
- Manual sync trigger via header badge tap

### Security
- Application PIN lock with biometric unlock (fingerprint / face)
- PIN stored in device Keychain (iOS) / Android Keystore via `capacitor-secure-storage-plugin`
- HTTPS enforced for all API communication
- `androidScheme: "https"` prevents cleartext traffic on Android

---

## Data Model

### Tables (PostgreSQL via Drizzle)

#### `clients`
| Column | Type | Description |
|---|---|---|
| `id` | `text` PK | UUID — generated on device |
| `name` | `text` | Outlet name |
| `phone` | `text` | Contact number |
| `address` | `text` | Primary address |
| `shop_type` | `text` | e.g. Supermarket, Kiosk, Hotel |
| `status` | `enum` | Lead / Contacted / Active / High Value / Inactive |
| `tags` | `text[]` | Array of string tags |
| `color_label` | `enum` | Red / Blue / Green / Yellow / Purple |
| `is_archived` | `boolean` | Soft archive flag |
| `visit_frequency` | `integer` | Target visits per month |
| `monthly_value_estimate` | `integer` | Estimated monthly revenue |
| `last_visit_at` | `bigint` | Unix timestamp ms of last logged visit |
| `created_at` | `bigint` | Unix timestamp ms |
| `updated_at` | `bigint` | Unix timestamp ms (sync conflict resolver) |
| `server_updated_at` | `timestamp` | Server-side upsert timestamp |

#### `fridges`
| Column | Type | Description |
|---|---|---|
| `id` | `text` PK | UUID |
| `client_id` | `text` FK | References `clients.id` (CASCADE DELETE) |
| `serial_no` | `text` | Physical serial number |
| `gcc_code` | `text` | GCC asset code |
| `qr_code_value` | `text` | QR code payload |
| `condition` | `enum` | Good / Fair / Needs Repair / Out of Service |
| `installation_date` | `bigint` | Unix timestamp ms |
| `last_checked_at` | `bigint` | Unix timestamp ms |
| `notes` | `text` | Free-form notes |

#### `visits`
| Column | Type | Description |
|---|---|---|
| `id` | `text` PK | UUID |
| `client_id` | `text` FK | References `clients.id` |
| `visited_at` | `bigint` | Unix timestamp ms of visit |
| `latitude` | `text` | GPS latitude |
| `longitude` | `text` | GPS longitude |
| `notes` | `text` | Visit notes |
| `outcome` | `text` | Visit outcome / checklist result |

#### `reminders`
| Column | Type | Description |
|---|---|---|
| `id` | `text` PK | UUID |
| `client_id` | `text` FK | References `clients.id` |
| `remind_at` | `bigint` | Unix timestamp ms for notification |
| `note` | `text` | Reminder message |
| `is_done` | `boolean` | Completion flag |

#### `images` (IndexedDB only — not synced to server)
Stored as base64 in Dexie, keyed by `entityId` and `entityType`. Not persisted in PostgreSQL.

---

## Offline-First Sync Architecture

```
Device                              Server
  │                                   │
  │── Create/Edit record ──────────►  │
  │   (_dirty = true, saved locally)  │
  │                                   │
  │   [No internet — queued]          │
  │                                   │
  │── Network reconnects / 60s ────►  │
  │   POST /api/sync/push             │
  │   { clients: [...], fridges: [...], visits: [...], reminders: [...] }
  │                                   │
  │◄─ { synced: N, errors: [] } ─────│
  │   (_dirty = false for synced IDs) │
  │                                   │
  │── GET /api/sync/pull?since=<ms> ─►│
  │◄─ { clients: [...], ... } ────────│
  │   (upsert into local Dexie)       │
```

**Conflict resolution:** Last-write-wins by `updatedAt` (Unix timestamp ms). The server always stores the latest `serverUpdatedAt` on every upsert. For V1 single-agent use this is sufficient. Multi-user conflict resolution (with merge UI) is on the roadmap.

**What is synced:** Clients, fridges, visits, reminders.
**What is NOT synced:** Photos/images (IndexedDB base64 only — requires object storage for cloud sync).

---

## Capacitor Plugin Inventory

| Plugin | Package | Purpose |
|---|---|---|
| Camera | `@capacitor/camera` | Visit and fridge photo capture |
| Geolocation | `@capacitor/geolocation` | GPS coordinates on visit log |
| Local Notifications | `@capacitor/local-notifications` | Reminder push notifications |
| Filesystem | `@capacitor/filesystem` | File export / import operations |
| Preferences | `@capacitor/preferences` | UI preferences (Keychain-backed on native) |
| Haptics | `@capacitor/haptics` | Tactile feedback on key actions |
| Share | `@capacitor/share` | OS share sheet for visit summaries, asset codes |
| Clipboard | `@capacitor/clipboard` | Copy serial numbers, GCC codes, phone numbers |
| Network | `@capacitor/network` | Online/offline detection for sync trigger |
| Status Bar | `@capacitor/status-bar` | Status bar colour and style control |
| Keyboard | `@capacitor/keyboard` | Resize behaviour on form screens |
| Splash Screen | `@capacitor/splash-screen` | Branded launch screen |
| Screen Orientation | `@capacitor/screen-orientation` | Lock to portrait on app start |
| App | `@capacitor/app` | Back button handling, app state events |
| App Launcher | `@capacitor/app-launcher` | Open Maps for client navigation |
| Barcode Scanner | `@capacitor-mlkit/barcode-scanning` | Camera-based barcode / QR scan (Google MLKit) |
| Biometric | `capacitor-native-biometric` | Fingerprint / face PIN unlock |
| Secure Storage | `capacitor-secure-storage-plugin` | PIN storage in OS Keychain / Keystore |
| Badge | `@capawesome/capacitor-badge` | App icon badge (unread reminders) |
| File Picker | `@capawesome/capacitor-file-picker` | Document / image file import |

---

## API Reference

Base URL: `/api`

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service liveness check. Returns `{ status: "ok" }` |

### Clients

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/clients` | List all clients |
| `GET` | `/clients/:id` | Get single client |
| `POST` | `/clients` | Create client |
| `PUT` | `/clients/:id` | Update client |
| `DELETE` | `/clients/:id` | Delete client |

### Fridges

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/fridges` | List all fridges |
| `GET` | `/fridges/:id` | Get single fridge |
| `GET` | `/clients/:id/fridges` | List fridges for a client |
| `POST` | `/fridges` | Create fridge |
| `PUT` | `/fridges/:id` | Update fridge |
| `DELETE` | `/fridges/:id` | Delete fridge |

### Visits

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/visits` | List all visits |
| `GET` | `/visits/:id` | Get single visit |
| `GET` | `/clients/:id/visits` | List visits for a client |
| `POST` | `/visits` | Create visit |
| `PUT` | `/visits/:id` | Update visit |
| `DELETE` | `/visits/:id` | Delete visit |

### Reminders

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/reminders` | List all reminders |
| `GET` | `/reminders/:id` | Get single reminder |
| `POST` | `/reminders` | Create reminder |
| `PUT` | `/reminders/:id` | Update reminder |
| `DELETE` | `/reminders/:id` | Delete reminder |

### Sync

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sync/push` | Bulk upsert dirty records from device. Body: `{ clients, fridges, visits, reminders }`. Returns `{ synced: number, errors: string[] }` |
| `GET` | `/sync/pull?since=<ms>` | Pull all records updated after `since` Unix timestamp ms. Returns `{ clients, fridges, visits, reminders }` |

All write endpoints validate request bodies against Drizzle-Zod derived schemas. Invalid requests return `400` with structured error details.

---

## Getting Started

### Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 20+ | `node --version` |
| pnpm | 10+ | `pnpm --version` |
| PostgreSQL | 14+ | `psql --version` |

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd workspace

pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env — see Environment Variables section below
```

### 3. Set up the database

```bash
# Push the Drizzle schema to your PostgreSQL instance
cd lib/db
pnpm db:push
```

### 4. Start development servers

```bash
# From workspace root — starts all services concurrently
pnpm dev

# Or start individually:
pnpm --filter @workspace/api-server dev    # API server
pnpm --filter @workspace/field-sales dev   # Frontend PWA
```

The frontend is available at the Replit preview URL.
The API server runs on the port assigned by the `PORT` environment variable.

---

## Environment Variables

### API Server (`artifacts/api-server/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `PORT` | No | Server port (assigned by platform) | `3001` |
| `NODE_ENV` | No | `development` or `production` | `production` |

### Frontend (`artifacts/field-sales/.env`)

| Variable | Required | Description | Example |
|---|---|---|---|
| `VITE_API_URL` | No | API base URL override | `https://your-api.replit.app` |

> All secrets should be stored in Replit Secrets (or your CI/CD secret manager). Never commit `.env` files containing credentials to source control.

---

## Database Setup

This project uses Drizzle ORM with PostgreSQL.

```bash
# Install the Drizzle CLI (if not already installed)
pnpm add -g drizzle-kit

# Navigate to the db package
cd lib/db

# Push schema to database (development — no migration files)
pnpm db:push

# Generate migration files (production-grade)
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Open Drizzle Studio (visual DB browser)
pnpm db:studio
```

### Schema location

All table definitions live in `lib/db/src/schema/`. Changes to any table must be made here — the API server and frontend types are both derived from this single source of truth.

---

## Running in Development

```bash
# Start everything from the workspace root
pnpm dev

# Check API health
curl http://localhost:<PORT>/api/health
# → { "status": "ok" }

# View API server logs
# → Console output from @workspace/api-server workflow

# View frontend
# → Open the Replit preview pane (field-sales artifact)
```

The sync badge in the app header will show "Offline" in development if the API server is not running. Start both services to test the full sync flow.

---

## Native Android Build

A complete CLI-based Android build guide for Linux/NixOS environments is provided in:

```
ANDROID_BUILD.md
```

It covers all 20 steps from Java JDK installation through to a signed Release AAB ready for Google Play, including:

- Java JDK 17 setup (NixOS / Ubuntu / manual)
- Android Command Line Tools (no Android Studio)
- Full `AndroidManifest.xml` permissions for all 20 plugins
- App icon generation via ImageMagick CLI
- Debug APK build and ADB device install
- Release keystore generation and signing configuration
- AAB bundle build for Google Play Store
- Troubleshooting for 8 common failure scenarios

**Android requirements for this app:**

| Setting | Value |
|---|---|
| Minimum SDK | API 29 (Android 10.0) |
| Target SDK | API 35 (Android 15.0) |
| Compile SDK | API 35 (Android 15.0) |
| App ID | `com.fieldsales.app` |
| Java | 17 (LTS) |

---

## Production Deployment

This project is deployed on Replit with automatic HTTPS and environment isolation.

### Deploy

1. Ensure all environment variables are set in Replit Secrets
2. Run the database migration against the production database:
   ```bash
   DATABASE_URL=<production-url> pnpm --filter @workspace/db db:push
   ```
3. Publish via the Replit deploy button or CLI

### Architecture in production

- **Frontend:** Vite static build served via Replit's CDN proxy
- **API Server:** Node.js/Express process managed by Replit's workflow runner
- **Database:** Replit PostgreSQL (managed, automatically backed up)
- **HTTPS:** Replit auto-TLS on all subdomains
- **Android app:** Connects to the production API URL; `androidScheme: "https"` enforced

---

## Security Considerations

| Area | Current Implementation | Recommendation for V2 |
|---|---|---|
| **API Authentication** | None — open API | Add JWT or session-based auth before multi-user rollout |
| **Data Scoping** | All agents share one data pool | Add `userId` / `teamId` to all tables for row-level access |
| **PIN Storage** | iOS Keychain / Android Keystore via `capacitor-secure-storage-plugin` | Sufficient for V1 |
| **Transport** | HTTPS enforced (`androidScheme: "https"`) | Consider certificate pinning for high-security environments |
| **API Rate Limiting** | Not implemented | Add `express-rate-limit` before public exposure |
| **Soft Deletes** | Not implemented | Add `deletedAt` timestamp to propagate deletes via sync |
| **Image Storage** | Base64 in IndexedDB (device only) | Move to object storage (S3/GCS) with signed URLs for cloud backup |
| **Device Tracking** | Not implemented | Add `@capacitor/device` `deviceId` to sync push payloads once auth is added |

---

## Roadmap

### V1 — Current

- [x] Full offline-first CRUD (clients, fridges, visits, reminders)
- [x] Background sync with dirty-flag queue
- [x] Sync status badge with manual trigger
- [x] Biometric PIN lock
- [x] Camera photo capture and storage
- [x] Barcode / QR code scanner (MLKit)
- [x] GPS visit logging
- [x] Local push notifications for reminders
- [x] Share and clipboard for asset codes
- [x] Android portrait lock
- [x] Android native build guide (CLI, Linux)

### V2 — Planned

- [ ] User authentication (JWT + login screen)
- [ ] Data scoped per sales agent / team
- [ ] Photo sync via cloud object storage
- [ ] Soft deletes propagated through sync
- [ ] Multi-device conflict resolution UI
- [ ] iOS native build + App Store submission
- [ ] `@capacitor/device` integration for device-stamped sync records
- [ ] API rate limiting
- [ ] Push notification delivery via FCM (remote alerts from manager)
- [ ] Reporting dashboard for managers (visit frequency, coverage maps)

---

## Contributing

1. All shared types live in `lib/db/src/schema/` — never duplicate type definitions in the frontend or API
2. All Capacitor plugin usage must go through an abstraction in `artifacts/field-sales/src/lib/native/` — never import plugin packages directly in page or component files
3. All API route handlers validate request bodies using schemas from `@workspace/db` — never write hand-coded Zod schemas for database entities
4. Mark every create/update operation in a Dexie repository with `_dirty: true` — this is what feeds the sync queue
5. Run `pnpm typecheck` from the workspace root before committing

---

*Built with Capacitor 8, React 19, Drizzle ORM, and PostgreSQL.*

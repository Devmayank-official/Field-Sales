# Product Requirements Document (PRD)

## Product Name
**Field Sales & Asset Intelligence App**

## Product Vision
A minimal, premium, offline-first field application for Coca-Cola sales agents to manage clients, track visits, record fridge assets, capture proof images and QR data, and get actionable daily insights — all from a fast mobile-friendly web app that can also ship as a native Android app through Capacitor.

## One-Line Summary
A personal field-sales operating system for client management, fridge/asset tracking, visit logging, and smart reminders.

---

## 1. Background
Field sales work is fast, mobile, and often done in places with weak network connectivity. Existing company applications are optimized for ordering or company workflows, but they do not always serve the personal workflow of the field agent: remembering shop details, tracking visits, checking fridge assets, and keeping proof of work. This product solves that gap.

---

## 2. Product Goals
1. Make client and fridge tracking fast, structured, and easy.
2. Support offline work completely.
3. Reduce missed visits and forgotten follow-ups.
4. Provide a premium but minimal interface that can be used in seconds while standing in the field.
5. Ship first as a web app/PWA and later as a native-feeling mobile app using Capacitor.
6. Keep the product simple in V1, but architect it so it can grow into sync, backup, and multi-device support later.

---

## 3. Product Principles
The product must follow these principles at all times:

### SOLID
- **Single Responsibility:** each module does one job.
- **Open/Closed:** new statuses, filters, or asset types can be added without rewriting core flows.
- **Liskov Substitution:** repositories and services can be swapped later without breaking the app.
- **Interface Segregation:** small focused interfaces, not giant “do everything” types.
- **Dependency Inversion:** UI depends on abstractions, not on the database directly.

### KISS
- Keep flows short.
- Keep forms short.
- Keep labels obvious.
- Avoid unnecessary screens.

### YAGNI
- Do not build multi-user collaboration yet.
- Do not build advanced AI yet.
- Do not build complex sync or role systems in V1.
- Only build what the field user needs immediately.

### Additional Principles
- **Offline-first by default**
- **Mobile-first UX**
- **Fast actions over deep menus**
- **Minimal visual noise**
- **Data ownership stays local first**

---

## 4. Target Users
### Primary User
- Field Sales Executive / Sales Representative working for Coca-Cola or a similar FMCG workflow.

### Secondary Users
- Distribution agents.
- Sales supervisors.
- Internal operations users in future versions.

### Key User Characteristics
- Uses a mobile device most of the time.
- Has limited time during visits.
- May have weak or intermittent internet.
- Needs quick capture of data, not complicated navigation.

---

## 5. Problem Statement
Current field workflows commonly suffer from:
- client data scattered across notebooks, memory, photos, or spreadsheets,
- missed follow-ups,
- no consistent visit structure,
- no simple fridge/asset tracking with proof,
- internet dependency,
- long or complicated forms that are hard to use in the field.

This product solves these problems with an offline-first, structured, and mobile-friendly system.

---

## 6. Product Scope
### In Scope for V1
- Client management with full CRUD.
- Fridge/asset management with full CRUD.
- Visit logging with structured workflow.
- Image capture/storage for visits and fridges.
- QR code storage and QR scan support.
- Search and filters.
- Dashboard summary.
- Rule-based alerts and reminders.
- Offline-first local database.
- PWA installability.
- Capacitor wrapper for Android native features.

### Out of Scope for V1
- Multi-user collaboration.
- Server-side cloud sync.
- Advanced AI recommendations.
- Team dashboards.
- Complex ERP or order placement integrations.
- Role-based access control.

---

## 7. Product Positioning
This is not a generic CRM.
This is a **personal sales brain** and **asset tracking assistant** for field work.

The app should feel like:
- instant,
- reliable,
- private,
- clean,
- and practical.

---

## 8. Core Business Entities
### 8.1 Client
A shop, retailer, customer, or outlet managed by the sales agent.

#### Core Client Fields
- Client ID
- Name
- Phone number
- Email
- Address
- Sub-address / landmark
- Pincode
- Shop type
- Status pipeline
- Tags
- Notes
- Created at
- Updated at
- Last visit date
- Visit frequency
- Monthly value estimate

#### Suggested Client Status Pipeline
- Lead
- Contacted
- Active
- High Value
- Inactive

### 8.2 Fridge / Asset
A Coca-Cola fridge or cooler attached to a client.

#### Core Fridge Fields
- Fridge ID
- Linked client ID
- Serial number
- GCC code
- QR code value or image reference
- Condition
- Installation date
- Last checked date
- Last image date
- Notes
- Created at
- Updated at

#### Suggested Fridge Condition Values
- Good
- Needs Repair
- Critical
- Dead

### 8.3 Visit
A structured check-in event for a client.

#### Core Visit Fields
- Visit ID
- Linked client ID
- Visit start time
- Visit end time
- Location data
- Manual location note
- Notes
- Follow-up outcome
- Fridges checked
- Images captured
- Tasks completed
- Created at

### 8.4 Image / Proof
Any photo captured for a visit or fridge.

#### Core Image Fields
- Image ID
- Linked entity type
- Linked entity ID
- Local file reference
- Thumbnail reference
- Captured at
- Caption / note

---

## 9. Major Features
### 9.1 Client Management
- Create client
- Edit client
- Delete client
- View client detail page
- Search clients
- Filter by status, tags, last visit, and value band
- Mark status pipeline stage
- Add notes
- View visit history
- View linked fridges

### 9.2 Fridge Management
- Create fridge record
- Link fridge to a client
- Edit fridge details
- Delete fridge
- Store serial number and GCC code
- Store QR code information
- Store one or more images per fridge
- Record fridge condition
- View fridge history
- Search and filter fridges

### 9.3 Visit Workflow
The visit flow must be structured and fast.

#### Visit Steps
1. Open client.
2. Tap Start Visit.
3. Capture notes.
4. Check one or more fridges.
5. Capture images.
6. Optionally record location.
7. End visit.

#### Visit Features
- Start/stop session
- Link to client
- Attach fridge checks
- Add notes
- Add multiple images
- Save manual location or GPS location
- Store follow-up outcome

### 9.4 Dashboard / Home
The home screen should show only useful summary items.

#### Home Metrics
- Total clients
- Active clients
- High value clients
- Visits done today
- Pending follow-ups
- Fridges needing attention
- Missed visits

#### Home UX Rules
- One glance summary.
- No unnecessary charts in V1.
- Use cards and clean spacing.

### 9.5 Search and Filtering
- Global search across clients and fridges.
- Search by name, phone, serial number, GCC code, and pincode.
- Filter by status, tags, condition, date range, and visit state.

### 9.6 Alerts and Smart Suggestions
Rule-based, not AI-heavy in V1.

#### Alerts Examples
- Client not visited for X days.
- Fridge not checked for X days.
- High-value client overdue for follow-up.
- Fridge condition marked as critical.

### 9.7 Notes
- Add notes to clients.
- Add notes to visits.
- Add notes to fridges.
- Notes must be quick to create.

### 9.8 QR and Proof Support
- Store QR code reference.
- Display QR image or scanned value.
- Allow scan-based fridge identification.
- Store multiple images for proof.

### 9.9 Export and Backup
- Manual export supported in V1.
- Future cloud sync prepared but not required.

---

## 10. User Experience Requirements
### Overall UX Style
- Minimal.
- Premium.
- Production-grade.
- Not verbose.
- Not crowded.
- Clear action hierarchy.

### UX Rules
- Keep primary actions visible.
- Keep forms short.
- Avoid multiple nested screens unless necessary.
- Use strong visual hierarchy.
- Show only what matters in the current context.
- Favor speed and clarity over decorative complexity.

### Field Usage Rules
- One-hand friendly where possible.
- Large touch targets.
- Fast save interactions.
- Immediate feedback after actions.
- Support weak network and offline work without blocking the user.

---

## 11. Information Architecture
### Main Screens
1. Home / Dashboard
2. Clients list
3. Client detail
4. Fridge detail
5. Visit screen
6. Settings

### Navigation Model
- **Top App Bar**: app name, search, settings.
- **Bottom Navigation**:
  - Home
  - Client Management
  - Settings
- **FAB**:
  - Add Client
  - Start Visit
  - Add Note

### Why this structure
- It is simple.
- It is familiar.
- It is usable on mobile.
- It reduces cognitive load.

---

## 12. Detailed User Flows
### 12.1 Open App Flow
1. User opens app.
2. App loads local data immediately.
3. User sees home dashboard.
4. User sees today’s actions and alerts.

### 12.2 Add Client Flow
1. Tap FAB.
2. Choose Add Client.
3. Enter minimal required data.
4. Save.
5. Optionally fill more fields later.

### 12.3 Start Visit Flow
1. Tap FAB or client action.
2. Start visit.
3. Visit timer/session opens.
4. Add notes, images, and fridge checks.
5. End visit.
6. Data is stored locally.

### 12.4 Fridge Check Flow
1. Open client.
2. Open Fridges tab.
3. Select fridge.
4. Update condition.
5. Capture images.
6. Save QR or serial-related proof if needed.

### 12.5 End of Day Flow
1. Open dashboard.
2. Review completed visits.
3. Review missed follow-ups.
4. Check fridge alerts.
5. Plan next day.

---

## 13. Responsive Design Requirements
The app must behave well across:
- small Android phones,
- medium phones,
- tablets,
- desktop web browsers.

### Responsive Rules
- Mobile-first layout.
- Bottom navigation on small screens.
- Wider layouts may show side padding and more detailed cards.
- Do not expose desktop-heavy complexity to mobile users.
- Keep important actions reachable without scrolling too much.

---

## 14. Low-End Device Strategy
The app must perform well on weak devices.

### Requirements
- Fast startup.
- Minimal re-renders.
- Lightweight bundles.
- Efficient local queries.
- List virtualization for large datasets.
- Image compression before storage.
- Limited animation on low-end devices.

### Low-End UX Rules
- Prefer simple cards over heavy visual charts.
- Avoid long animations.
- Use instant loading skeletons only where necessary.
- Keep screen elements easy to tap.

---

## 15. High-End Device Strategy
On better devices, the app should feel richer without changing the core product.

### Enhancements Allowed
- Smoother motion transitions.
- Richer dashboard cards.
- Better search responsiveness.
- More detailed preview layouts.
- Expanded analytics later.

### Important Rule
High-end capabilities must never break low-end usability.

---

## 16. Offline-First Requirements
Offline-first is a core product constraint.

### Behavior
- App must work fully without network.
- All create/update/delete actions must work locally.
- Data must persist across browser/app restarts.
- UI must not block when offline.
- Network availability should be treated as optional for V1.

### Offline Data Source of Truth
- Local storage via IndexedDB using Dexie.

---

## 17. PWA Requirements
The web app must be installable as a PWA.

### PWA Features
- Installable on supported devices.
- Service worker for caching app shell.
- Fast repeat loads.
- Offline access to the application shell.
- App icon and splash support.
- Home screen installation support.

### PWA Goal
The app should feel usable as a web app first and remain installable as a mobile-like experience.

---

## 18. Capacitor Requirements
Capacitor will be used to convert the web app into a native Android app with access to mobile features.

### Why Capacitor
- Native Android packaging.
- Camera access.
- Filesystem access.
- Geolocation access.
- Notifications support.
- QR scanning support.
- Better native-like distribution potential.

### Capacitor Goal
Keep the React codebase the same while gaining native capabilities.

### Capacitor Features to Prioritize
- Camera
- Geolocation
- Device info
- Network state
- Local notifications
- File handling

### Design Rule
Do not use Ionic UI components as the primary design system. Keep Ant Design as the main UI layer and use Capacitor for native bridge features.

---

## 19. Technology Stack
### Frontend
- React
- TypeScript
- Ant Design
- Framer Motion

### State Management
- Zustand for UI state and transient app state.

### Data and Caching
- TanStack Query for query orchestration and cache patterns.
- Dexie for IndexedDB access.

### Offline Storage
- IndexedDB via Dexie.
- OPFS can be used for file-oriented storage where appropriate and supported.

### Native Bridge / Packaging
- Capacitor.

### PWA
- Service worker.
- Manifest.

---

## 20. Architecture Rules
### Data Ownership
- Business data must live in Dexie/IndexedDB.
- UI state may live in Zustand.
- Query layer should orchestrate reads and mutations.

### Layering
- UI layer
- Hook layer
- Repository/service layer
- Storage layer

### Required Separation
- Components should not talk directly to database APIs.
- Components should call hooks.
- Hooks should call repositories/services.
- Services should talk to Dexie.

### Why
This keeps the app testable, replaceable, and maintainable.

---

## 21. Suggested Folder Structure
```text
src/
  app/
    providers/
    router/
    layout/
  shared/
    ui/
    types/
    utils/
    constants/
  entities/
    client/
    fridge/
    visit/
    image/
  features/
    client-management/
    fridge-management/
    visit-management/
    dashboard/
    settings/
  services/
    db/
    repositories/
    storage/
  store/
  hooks/
  assets/
```

### Folder Purpose
- **app**: bootstrapping and routing.
- **shared**: reusable primitives.
- **entities**: domain models.
- **features**: user-facing business areas.
- **services**: database and storage logic.
- **store**: Zustand stores.
- **hooks**: reusable app hooks.

---

## 22. Data Model Requirements
### Client Table
Fields:
- id
- name
- phone
- email
- address
- subAddress
- pincode
- shopType
- status
- tags
- notes
- createdAt
- updatedAt
- lastVisitAt

### Fridge Table
Fields:
- id
- clientId
- serialNo
- gccCode
- qrCodeValue
- condition
- installationDate
- lastCheckedAt
- notes
- createdAt
- updatedAt

### Visit Table
Fields:
- id
- clientId
- startedAt
- endedAt
- locationLat
- locationLng
- locationNote
- notes
- status
- createdAt
- updatedAt

### Image Table
Fields:
- id
- entityType
- entityId
- fileRef
- thumbnailRef
- createdAt
- caption

### Relationship Rules
- One client can have multiple fridges.
- One visit belongs to one client.
- One visit may have multiple images.
- One fridge may have multiple images over time.

---

## 23. Query and State Strategy
### Zustand Use Cases
- modal visibility
- FAB menu state
- active visit session state
- search/filter UI state
- theme and shell state

### TanStack Query Use Cases
- cached reads from local repositories
- mutation orchestration
- invalidation after writes
- derived screens depending on stored data

### Dexie Use Cases
- persistent CRUD operations
- offline storage
- query indexing
- local-first persistence

### Rule
Do not store the core domain data permanently in Zustand.

---

## 24. Native Mobile Feature Requirements
Using Capacitor, the app should support:
- Camera capture for fridge and visit images.
- File storage for locally managed media.
- Geolocation capture at visit start/end.
- Optional local notifications for reminders.
- Device/network awareness.
- QR code scan support.

### Priority Order
1. Camera
2. Geolocation
3. Filesystem handling
4. Notifications
5. QR scan

---

## 25. UI Requirements
### Visual Style
- Minimal
- Premium
- Clean
- Professional
- No clutter

### UI Patterns
- Card-based dashboard
- Chip-based filters
- Bottom nav on mobile
- Top app bar with clear actions
- Simple empty states
- Strong spacing and typography hierarchy

### Styling Rules
- Use a small, controlled color palette.
- Use status colors consistently.
- Avoid decorative overload.
- Keep the interface calm and efficient.

---

## 26. Performance Requirements
- Fast initial load.
- Smooth scrolling with large client lists.
- Quick data entry and save.
- Efficient local querying.
- Minimal memory waste.
- Image compression before storage.
- Route-level code splitting where practical.

---

## 27. Empty States and Error States
### Empty States
- No clients yet.
- No visits yet.
- No fridges yet.
- No search results.

### Error States
- Storage failure.
- Permission denied for camera/location.
- Invalid data input.
- Sync unavailable in future.

### UX Rule
Error messages must be short and clear.

---

## 28. Validation Rules
### Client
- Name required.
- Phone recommended.
- Pincode optional but useful.

### Fridge
- Client link required.
- Serial number recommended.
- GCC code optional but supported.

### Visit
- Client link required.
- Start time required.
- End time required to close session.

---

## 29. Security and Privacy Requirements
- Local-first data ownership.
- Avoid unnecessary data collection.
- Request permissions only when needed.
- Store data securely within local app boundaries.
- Keep future cloud sync optional, not mandatory.

---

## 30. Future Roadmap
### Phase 1
- Offline-first core app.
- Clients.
- Fridges.
- Visits.
- Dashboard.
- Search and filters.

### Phase 2
- Cloud sync.
- Export/import improvements.
- Better notifications.
- Better analytics.

### Phase 3
- AI suggestions.
- Multi-device support.
- Team workflows.
- Advanced reporting.

---

## 31. Success Metrics
The product is successful if:
- Daily use becomes natural.
- Visit logging becomes faster.
- Fridge tracking becomes consistent.
- Follow-ups are missed less often.
- The user prefers this app over notebooks/spreadsheets.
- The app works reliably offline.

---

## 32. Risks
- Overbuilding too early.
- Too many screens.
- Too many fields in initial form.
- Large images slowing down low-end devices.
- Confusing navigation.
- Adding backend complexity too soon.

### Risk Mitigation
- Keep V1 simple.
- Use short forms.
- Compress images.
- Design for offline first.
- Avoid non-essential features.

---

## 33. Acceptance Criteria
The product is acceptable when:
- Clients can be created, edited, deleted, searched, and filtered.
- Fridges can be linked to clients and tracked.
- Visits can be started and ended with notes and images.
- Data remains available offline.
- The app feels fast and clean on mobile.
- Capacitor can package the app for native Android use.
- The product remains minimal and premium.

---

## 34. Final Product Definition
This product is a **minimal, premium, offline-first sales and asset intelligence app** designed for field sales work in a Coca-Cola-like environment, with client management, fridge tracking, visit workflows, QR/image support, PWA installability, and Capacitor-based native mobile readiness.

---

## 35. Final Statement
Build the app as a private field tool first. Keep it simple. Keep it fast. Keep it offline. Keep it native-ready. Then expand only when the core workflow is proven.


# Nawy Orders — Restaurant Admin Dashboard

A React + TypeScript dashboard for restaurant owners and authorized staff using the **Nawy Orders** multi-tenant restaurant-ordering platform.

The Restaurant Admin Dashboard provides a centralized interface for managing restaurant operations, monitoring business activity, and accessing restaurant-specific management tools.

> **Scope:** This application is exclusively the Restaurant Admin Dashboard. It is separate from the Platform Super Admin Dashboard, which manages restaurants (tenants), subscriptions, packages, and platform-wide operations. Each restaurant admin operates within their assigned restaurant context.

## Tech Stack

- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** — Development server and build tool
- **Tailwind CSS** — Utility-first styling and responsive design
- **React Router** — Client-side routing for the five dashboard pages
- **Cairo / Tajawal** — Arabic fonts (Google Fonts)

## Requirements

- Node.js 20+ (verified with Node.js 24.20.0)
- npm

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The application will be available at:

[http://localhost:5173](http://localhost:5173)

### 4. Configure environment variables

Copy `.env.example` to `.env` and fill in valid El Fahm tenant credentials:

```bash
cp .env.example .env
```

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Tenant API origin (HTTPS only, no embedded credentials) |
| `VITE_LOGIN_OWNER_EMAIL` | Owner account prefilled on the login form |
| `VITE_LOGIN_MANAGER_EMAIL` | Branch manager account |
| `VITE_LOGIN_STAFF_EMAIL` | Staff account |
| `VITE_LOGIN_PASSWORD` | Password for the prefilled development accounts |

`.env` is gitignored and never committed. Vite loads `.env` in every mode. Do not add `.env.development.local`, because it would override `.env` during development.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript checks and build for production |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Check application and unit-test TypeScript |
| `npm test` | Run Vitest authentication and React regression tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Chrome login, keyboard and responsive tests |

Browser tests use installed Google Chrome and start an isolated Vite server on port 5178. All test authentication responses are intercepted fixtures; no real account credentials are submitted. Screenshots and reports are ignored by Git. Tracing is disabled to avoid recording credentials.

## Restaurant Staff Login

Login connects to the [Nawy Orders Tenant API documentation](https://el-fahm-01a1c1ed11cf79ffbe51681899bb90fd.api.nawyorders.com/swagger/index.html). The server origin comes from `VITE_API_BASE_URL` in `.env` (falling back to the El Fahm URL) and is exposed as `API_BASE_URL` in `src/auth.ts`.

- `POST /api/v1/auth/login` sends `{ email, password }` over HTTPS. Enter your existing restaurant credentials. Development builds also expose an explicit demo sign-in behind `?mock=1` (see below).
- The adapter validates the documented `isSuccess`/`data` response envelope. Identity, roles, permissions and token expiry come from the server, not a local account list.
- Access and refresh tokens are kept in memory only. Reloading the page or reaching token expiry requires signing in again. Automatic refresh is intentionally not implemented.
- Sign-out clears the local dashboard immediately and attempts `POST /api/v1/auth/revoke`. A warning remains visible if server revocation fails.
- Authentication never persists passwords or tokens in browser storage. The obsolete `nawy_session` demo key is removed on startup.
- Each login mounts a fresh dashboard. Local preview preferences are partitioned by API origin and user ID; they are not backend authorization.

The API must enforce tenant context and permissions for every future operational request. Frontend session gating is not a security boundary. This implementation does not verify JWT signatures or implement a backend authentication service.

### Development Demo Sign-In

The El Fahm tenant currently rejects the sample credentials in `.env` with `401 Invalid email or password`. For local UI work, open `http://localhost:5173/?mock=1` and use the **Demo sign-in (development only)** buttons to mount the dashboard as Owner, Manager, or Staff.

- Demo sessions exist only in development builds (`import.meta.env.DEV`) and only when `?mock=1` is present.
- They are created in memory, never sent to the tenant API, and use the mock orders adapter.
- They are not a production authentication path; real login remains the default and server roles stay authoritative.
- Real sign-in requires valid tenant credentials. Update `.env` or initialize accounts through the invitation flow (`POST /api/v1/auth/set-initial-password`).

## Demo Environment

The application ships with **seeded demo data** for local development and UI work. Home renders sample data from `src/i18n.ts`; the routed pages read from the local preview adapter until their endpoints are confirmed.

> **Note:** Only staff login and session revocation use the real API. The Home KPIs, chart, and top items remain sample data. The Orders, Menu, Reports, and Settings pages use the local preview adapter until their endpoints are confirmed. Append `?mock=1` to load the orders feed through the `Api` mock adapter and to reveal the development demo sign-in. A persistent banner explains the active data mode.

### Data Integration Foundation

`src/api/` defines a single `Api` interface plus two interchangeable adapters, both unit-tested with Vitest:

- `httpApi.ts` — real tenant adapter for `GET /api/v1/admin/orders`, `POST /api/v1/admin/orders/{id}/transition-status`, and `GET /api/v1/Branding`. Menu, reports, and settings methods are marked `// TODO: confirm endpoint with backend`. It sends the Bearer token, validates the `isSuccess`/`data` envelope, maps failures to safe error codes, and supports ETag/304 conditional branding requests.
- `mockApi.ts` — seeded in-memory adapter with orders, menu, reports, settings, simulated latency, and a failure mode.
- `?mock=1` selects the mock adapter; `?mockError=1` simulates backend failures for error-state testing.

Orders are wired to the `Api` interface through `useOrders` and the `?mock=1` mock adapter, including loading, error, and retry states. The Orders board calls `transitionOrderStatus`; Menu calls `listMenu` and `updateMenuItemAvailability`; Reports calls `getReportsSummary`; Settings persists locally until `updateRestaurantSettings` is confirmed. Still planned:

- Confirm the menu, reports, and settings endpoints with the backend (marked TODO in `httpApi.ts`).
- Wiring Home KPIs, charts, and top items to the `Api` interface.
- TanStack Query for server-state management and caching.
- ESLint and coverage thresholds (Vitest tests are implemented).

## Project Structure

```text
src/
├── components/          # Shared layout and Home UI components
├── pages/               # Routed pages: Home, Orders, Menu, Reports, Settings
├── auth.ts              # Real tenant staff login/revocation HTTP adapter
├── api/                 # Typed Api interface + HTTP/mock data adapters
├── test/                # Test setup and synthetic API fixtures
├── calendar.ts          # Date grid, formatting, and storage helpers
├── icons.tsx            # SVG icon set used across the UI
├── i18n.ts              # Arabic/English translations, direction, and demo data
├── orders.ts            # Order formatting, status mapping, and filtering
├── reports.ts           # UTF-8 CSV report builder
├── App.tsx              # Router shell, auth gate, and dashboard layout
├── main.tsx             # React entry point
└── index.css            # Tailwind layers and global styles
```

### Component Responsibilities

| Component | Purpose |
|---|---|
| `Sidebar` | Desktop sidebar: brand, open switch, navigation, settings card |
| `MobileHeader` | Mobile top card: brand, open switch, notifications |
| `BottomNav` | Mobile fixed bottom navigation (5 items) |
| `Topbar` | Greeting, search, date pill, notifications, language toggle, logout, avatar |
| `StatCard` | Clickable KPI card with gradient icon tile and delta pill |
| `TopItems` | Ranked best-seller bars |
| `SalesChart` | Responsive SVG area chart with week/month toggle and active-point tooltip |
| `OrdersTable` | Latest orders: desktop table, mobile cards, loading/error/empty states |
| `PageHeading` | Page title, subtitle, and optional action |
| `BrandLogo` | Placeholder brand mark used by the sidebar and mobile header |
| `OrdersPage` | Live kanban with accept, reject, and status transitions |
| `MenuPage` | Category cards, item grid, and optimistic availability toggles |
| `ReportsPage` | Revenue hero, payment donut, peak-hours chart, best sellers, CSV export |
| `SettingsPage` | Branch, working hours, kitchen, and payment settings with local persistence |

Older dialog components remain in `components/` for future detail views but are not mounted by the router shell.

## Internationalization (RTL / LTR)

The dashboard ships with full **Arabic (RTL)** and **English (LTR)** support:

- All strings for both languages live in `src/i18n.ts`.
- Toggling the language button switches `dir`/`lang` on `<html>`, the page title, and every label instantly.
- Layouts use logical CSS properties (`start`/`end`, `ms-*`, `ps-*`, `border-s-*`) so the entire UI mirrors automatically.
- Arabic is the default language; fonts (Cairo/Tajawal) load from Google Fonts.

## Responsive Design

The dashboard supports desktop, tablet, and mobile layouts.

| Screen Size | Layout |
|---|---|
| 1280px and above (xl) | Full sidebar, 4-column KPI grid, 3-column reports |
| 1024px – 1279px (lg) | Full sidebar, 2-column KPI grid, 4-column orders board |
| Below 1024px | Mobile header card, 2-column KPI grid, settings stack vertically |
| Below 768px (md) | Orders table becomes cards; the orders board scrolls horizontally; menu items stay 2-up |

### Mobile Behavior

- The desktop sidebar is replaced by a compact `MobileHeader` card and a fixed `BottomNav` with 5 icon-and-label items; the active item gets brand color and a badge where relevant.
- Bottom navigation respects `env(safe-area-inset-bottom)` for phones with a home indicator.
- KPI cards switch from row layout to a centered column layout (icon, label, value, delta) and remain 2-up down to 320px.
- The greeting block, search field, and date pill stack on their own rows.
- Section order adapts: the sales chart appears above top-selling items on mobile, while they sit side-by-side on desktop.
- The orders table becomes tappable two-column cards; the live orders board becomes a horizontally scrollable column strip.
- Menu categories become a horizontal card strip, and menu items stay 2-up on phones.
- Reports and settings cards stack into a single column.

### Interactions

Every control is functional and explains its outcome:

- **Search** filters the latest orders list live; `Enter` jumps to the results. An empty state explains what to try next.
- **Notification bell** shows a toast placeholder until the notifications endpoint is wired.
- **Open/Closed switch** toggles order acceptance, updates the header summary, and shows a toast.
- **KPI cards** show a summary toast with the selected metric.
- **Chart week/month tabs** switch datasets; every point is focusable/tappable and shows its value.
- **Order rows / View all** navigate to the live orders board.
- **Orders board** accepts or rejects new orders and moves them through preparing, ready, and delivered using `transitionOrderStatus`.
- **Menu page** filters by category, shows availability badges, and toggles item availability optimistically through the `Api`.
- **Reports page** switches between day/week/month, renders the payment donut and peak-hours chart, and exports a UTF-8 CSV.
- **Settings page** edits branch details, working hours, kitchen preferences, and payment settings; changes persist to `localStorage`.

## Restaurant Data Isolation

Nawy Orders operates as a multi-tenant platform. Each restaurant must access only the information and operations associated with its assigned restaurant context.

### Tenant Isolation Principles

- Restaurant data must remain isolated between tenants.
- Authenticated users must only access restaurants they are authorized to manage.
- Restaurant-scoped API operations must enforce the correct restaurant context.
- Access permissions must be validated by the backend, not only by the frontend.
- Data from one restaurant must never be exposed to another restaurant.

**Important:** Frontend route protection and UI permissions are not substitutes for backend authorization and tenant isolation.

## Dashboard Data Integration

Staff authentication is implemented in `src/auth.ts`. The Home orders feed is wired to the `Api` interface: `useOrders` calls `listOrders`, maps `AdminOrderListItem` rows, and renders loading, error, and retry states in `OrdersTable`. The routed pages also call the `Api` interface: Orders uses `transitionOrderStatus`, Menu uses `listMenu` and `updateMenuItemAvailability`, Reports uses `getReportsSummary`, and Settings persists locally until `updateRestaurantSettings` is confirmed.

Remaining integration work:

1. Confirm the menu, reports, and settings endpoints with the backend (marked TODO in `httpApi.ts`).
2. Wire branding (`getBranding`), Home KPIs, sales series, and top items to the `Api` interface.
3. Make the HTTP adapter the default once the backend is available.
4. Enforce restaurant-level authorization and tenant isolation on the backend for every request.

Until each feed is wired, Home data lives in `src/i18n.ts` and component props.

## Roadmap

- [x] Typed `Api` interface with HTTP and mock adapters (latency + `?mockError=1`)
- [x] Demo dashboard indicator
- [x] Real restaurant staff login and session revocation
- [x] Vitest regression tests and Playwright responsive login tests
- [x] Wire the orders feed to the `Api` interface (`?mock=1`) with loading/error/retry states
- [x] React Router for Home, Orders, Menu, Reports, and Settings pages
- [x] Live orders kanban with status transitions
- [x] Menu management with availability toggles
- [x] Reports with range switching and CSV export
- [x] Restaurant settings with local persistence
- [ ] Confirm menu, reports, and settings endpoints with the backend
- [ ] Wire branding, Home KPIs, charts, and top items to the `Api` interface
- [ ] TanStack Query integration with cache invalidation
- [ ] ESLint and test coverage thresholds

## Platform Administration (Out of Scope)

The following remains outside this application and belongs to the Nawy Orders Super Admin Dashboard:

- Creating and managing restaurant tenants.
- Managing platform-wide subscriptions.
- Configuring platform packages and entitlements.
- Monitoring delivery status across all restaurants.
- Managing global platform settings.
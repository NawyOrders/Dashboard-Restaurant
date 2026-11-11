# Nawy Orders — Restaurant Admin Dashboard

A React + TypeScript dashboard for restaurant owners and authorized staff using the **Nawy Orders** multi-tenant restaurant-ordering platform.

The Restaurant Admin Dashboard provides a centralized interface for managing restaurant operations, monitoring business activity, and accessing restaurant-specific management tools.

> **Scope:** This application is exclusively the Restaurant Admin Dashboard. It is separate from the Platform Super Admin Dashboard, which manages restaurants (tenants), subscriptions, packages, and platform-wide operations. Each restaurant admin operates within their assigned restaurant context.

## Tech Stack

- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** — Development server and build tool
- **Tailwind CSS** — Utility-first styling and responsive design
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

The application currently uses **hard-coded demo data** rendered directly by the components for development and UI work.

> **Note:** Only staff login and session revocation use the real API. Dashboard KPIs, charts, top items and settings remain sample data. Orders are sample data by default; append `?mock=1` to load them through the `Api` mock adapter and to reveal the development demo sign-in. A persistent banner explains the active data mode.

### Data Integration Foundation

`src/api/` defines a single `Api` interface plus two interchangeable adapters, both unit-tested with Vitest:

- `httpApi.ts` — real tenant adapter for `GET /api/v1/admin/orders`, `POST /api/v1/admin/orders/{id}/transition-status`, and `GET /api/v1/Branding`. It sends the Bearer token, validates the `isSuccess`/`data` envelope, maps failures to safe error codes, and supports ETag/304 conditional branding requests.
- `mockApi.ts` — seeded in-memory adapter with simulated latency and a failure mode.
- `?mock=1` selects the mock adapter; `?mockError=1` simulates backend failures for error-state testing.

Orders are now wired to the `Api` interface through `useOrders` and the `?mock=1` mock adapter, including loading, error, and retry states. Still planned:

- Wiring branding, KPIs, charts, and top items to the `Api` interface.
- Sending status transitions through `POST /admin/orders/{id}/transition-status` (UI updates are local for now).
- TanStack Query for server-state management and caching.
- ESLint and coverage thresholds (Vitest tests are implemented).

## Project Structure

```text
src/
├── components/          # UI components (Sidebar, Topbar, StatCard, TopItems,
│                        # SalesChart, OrdersTable, Calendar, Modal, Dialogs, Login)
├── auth.ts              # Real tenant staff login/revocation HTTP adapter
├── api/                 # Typed Api interface + HTTP/mock data adapters
├── test/                # Test setup and synthetic API fixtures
├── calendar.ts          # Date grid, formatting, and storage helpers
├── icons.tsx            # SVG icon set used across the UI
├── i18n.ts              # Arabic/English translations, direction, and demo data
├── App.tsx              # Page composition, selected date, and language state
├── main.tsx             # React entry point
└── index.css            # Tailwind layers and global styles
```

### Component Responsibilities

| Component | Purpose |
|---|---|
| `Sidebar` | Desktop sidebar: brand, open switch, navigation, settings |
| `MobileHeader` | Mobile top card: avatar, notifications, open switch, brand |
| `BottomNav` | Mobile fixed bottom navigation (5 items) |
| `Topbar` | Search, functional date picker, notifications, greeting, language toggle |
| `StatCard` | KPI cards with delta badges (responsive column/row layout) |
| `TopItems` | Horizontal bar list of best-selling items |
| `SalesChart` | Responsive SVG area chart with week/month toggle, tap/hover values, RTL-aware ordering |
| `OrdersTable` | Latest orders: desktop table, mobile two-column cards, live search results |
| `CalendarDialog` | Localized month grid, RTL/LTR month navigation, today/selected states, saved selection |
| `Modal` | Accessible dialog shell: focus trap, Escape/backdrop close, scroll lock, mobile bottom sheet |
| `Dialogs` | Detail views for orders, all orders, metrics, top items, notifications, settings, and the button guide |

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
| 1280px and above (xl) | Full sidebar + 4-column KPI grid |
| 1024px – 1279px (lg) | Full sidebar, 2-column KPI grid |
| Below 1024px | Mobile header card, 2-column KPI grid, reordered sections |
| Below 768px (md) | Orders become cards; the chart scales to the screen width |

### Mobile Behavior

- The desktop sidebar is replaced by a compact `MobileHeader` card and a fixed `BottomNav` with 5 icon-and-label items; the active item gets a top indicator, brand color, and a badge where relevant.
- Bottom navigation respects `env(safe-area-inset-bottom)` for phones with a home indicator.
- KPI cards switch from row layout to a centered column layout (icon, label, value, delta) and remain 2-up down to 320px.
- The greeting block, search field, and date pill stack on their own rows; the secondary search/date/bell controls are hidden to avoid duplicating the mobile header.
- Section order adapts: the sales chart appears above top-selling items on mobile, while they sit side-by-side on desktop.
- The orders table becomes tappable two-column cards with a divider, status badge, total, time, and a details affordance.
- Detail dialogs open as bottom sheets on phones and centered dialogs on larger screens.

### Interactions & Detail Views

Every control is functional and explains its outcome:

- **Search** filters the orders list live; `Enter` jumps to the results. An empty state explains what to try next.
- **Date pill / calendar** opens a localized month picker with previous/next navigation, highlights today and the selected day, and saves the choice to `localStorage`.
- **Notification bell** opens recent alerts; items can be marked read individually or all at once (badge updates).
- **Open/Closed switch** toggles order acceptance, updates the header summary, and shows a toast.
- **KPI cards** open a metric detail sheet with today-vs-yesterday comparison and a shortcut to orders.
- **Chart week/month tabs** switch datasets; every point is focusable/tappable and shows its value.
- **Order rows / View all** open full order details (items, payment, timeline) with status actions that update the row.
- **Top items details button** opens per-item shares and sorting.
- **Settings** edits restaurant name, phone, address, language, and open status; changes are saved to `localStorage`.
- **Button guide (ⓘ)** in the top bar explains every button on the dashboard.

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

Staff authentication is implemented in `src/auth.ts`. The orders feed is wired to the `Api` interface: `useOrders` calls `listOrders`, maps `AdminOrderListItem` rows, and renders loading, error, and retry states in `OrdersTable`. By default the dashboard still renders local sample data; `?mock=1` switches the orders feed to the seeded mock adapter and `?mockError=1` exercises the error state.

Remaining integration work:

1. Wire branding (`getBranding`), KPIs, sales series, and top items to the `Api` interface.
2. Route order status actions through `transitionOrderStatus` (UI transitions are local for now).
3. Make the HTTP adapter the default once the backend is available.
4. Enforce restaurant-level authorization and tenant isolation on the backend for every request.

Until each feed is wired, non-order data lives in `src/i18n.ts` and component props.

## Roadmap

- [x] Typed `Api` interface with HTTP and mock adapters (latency + `?mockError=1`)
- [x] Demo dashboard indicator
- [x] Real restaurant staff login and session revocation
- [x] Vitest regression tests and Playwright responsive login tests
- [x] Wire the orders feed to the `Api` interface (`?mock=1`) with loading/error/retry states
- [ ] Wire branding, KPIs, charts, and top items to the `Api` interface
- [ ] Send order status transitions through the API
- [ ] TanStack Query integration with cache invalidation
- [ ] React Router for orders, menu, reports, and settings pages
- [ ] ESLint and test coverage thresholds

## Platform Administration (Out of Scope)

The following remains outside this application and belongs to the Nawy Orders Super Admin Dashboard:

- Creating and managing restaurant tenants.
- Managing platform-wide subscriptions.
- Configuring platform packages and entitlements.
- Monitoring delivery status across all restaurants.
- Managing global platform settings.
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

- Node.js 18+ (tested with Node.js 20+)
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

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Run TypeScript checks and build for production |
| `npm run preview` | Preview the production build |

## Demo Environment

The application currently uses **hard-coded demo data** rendered directly by the components for development and UI work.

> **Note:** Dashboard KPIs, charts, top items, and order lists are static demo values. No real backend is connected yet.

### Planned: Mock API Provider

The following capabilities are planned but **not yet implemented**:

- A mock data provider with simulated network latency.
- A `Demo data` badge in the interface when the mock provider is active.
- A `?mockError=1` query parameter to simulate API failures for error-state testing.
- TanStack Query for server-state management and caching.
- Vitest for unit and integration testing, and ESLint for linting.

## Project Structure

```text
src/
├── components/          # UI components (Sidebar, Topbar, StatCard, TopItems,
│                        # SalesChart, OrdersTable, Calendar, Modal, Dialogs)
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

## Backend Integration (Planned)

The current UI is static demo data. The planned integration approach:

1. Define a single `Api` interface describing all dashboard operations (KPIs, sales series, top items, orders).
2. Implement a mock adapter (seeded in-memory data, simulated latency) behind that interface.
3. Swap the mock adapter for an HTTP adapter (`fetch`/`axios`) without changing feature components.
4. Enforce restaurant-level authorization and tenant isolation on the backend for every request.

Until that interface exists, all data lives in `src/i18n.ts` and component props.

## Roadmap

- [ ] Mock API provider with latency and `?mockError=1` failure simulation
- [ ] `Demo data` indicator badge
- [ ] TanStack Query integration with cache invalidation
- [ ] React Router for orders, menu, reports, and settings pages
- [ ] ESLint + Vitest setup (`npm run lint`, `npm test`, coverage)
- [ ] Real backend HTTP adapter

## Platform Administration (Out of Scope)

The following remains outside this application and belongs to the Nawy Orders Super Admin Dashboard:

- Creating and managing restaurant tenants.
- Managing platform-wide subscriptions.
- Configuring platform packages and entitlements.
- Monitoring delivery status across all restaurants.
- Managing global platform settings.
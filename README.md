# Nawy Orders — Restaurant Admin Dashboard

A React + TypeScript dashboard for restaurant owners and authorized staff using the **Nawy Orders** multi-tenant restaurant-ordering platform.

The Restaurant Admin Dashboard provides a centralized interface for managing restaurant operations, monitoring business activity, and accessing restaurant-specific management tools.

> **Scope:** This application is exclusively the Restaurant Admin Dashboard. It is separate from the Platform Super Admin Dashboard, which manages restaurants (tenants), subscriptions, packages, and platform-wide operations. Each restaurant admin operates within their assigned restaurant context.

## Tech Stack

- **React** — UI library
- **TypeScript** — Type safety
- **Vite** — Development server and build tool
- **TanStack Query** — Server-state management and caching
- **React Router** — Client-side routing
- **Vitest** — Unit and integration testing
- **ESLint** — Code quality and linting

## Requirements

- Node.js 18+ (tested with Node.js 20)
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
| `npm run lint` | Run ESLint (zero warnings allowed) |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Run tests using Vitest |
| `npm run test:coverage` | Run tests with coverage thresholds enforced |
| `npm run preview` | Preview the production build |

## Demo Environment

The application currently uses a **mock data provider** for development and testing.

### Demo Data Indicator

When the mock provider is active, a `Demo data` badge is displayed in the application interface to distinguish mock information from production data.

Dashboard KPIs are dynamically calculated from the data returned by the provider. No KPI values are hard-coded.

### Testing Error States

Append the following query parameter to any application URL to simulate API failures:

```text
?mockError=1
```

Every API request will reject, allowing error handling and failure states to be tested.

## Restaurant Management Scope

The Restaurant Admin Dashboard is designed around individual restaurant operations rather than platform-wide administration.

Its responsibility is to provide restaurant-specific access to operational information and management functionality.

The exact available modules and permissions depend on the features implemented in the application.

**Platform administration remains outside this application**, including:

- Creating and managing restaurant tenants.
- Managing platform-wide subscriptions.
- Configuring platform packages and entitlements.
- Monitoring delivery status across all restaurants.
- Managing global platform settings.

These responsibilities belong to the Nawy Orders Super Admin Dashboard.

## Project Architecture

The project follows a **Clean Architecture** approach, keeping business logic independent from frameworks and external implementations.

Dependencies flow inward:

`Presentation → Application → Domain`

The Infrastructure layer implements the interfaces defined by the Application layer.

```text
src/
├── domain/                  # Enterprise business rules
│   ├── entities/            # Domain entities and enums
│   └── rules/               # Business rules, permissions and validation
│
├── application/             # Application orchestration
│   ├── dto.ts               # API contracts and data shapes
│   ├── ports.ts             # Repository, clock, ID and permission interfaces
│   └── use-cases/           # Use cases and backend composition
│
├── infrastructure/          # Implementations of application ports
│   ├── repositories/        # In-memory data stores
│   ├── mock/                # Mock API adapter
│   ├── seed/                # Development seed data
│   ├── clock/               # System clock implementation
│   └── ids/                 # ID generator
│
├── presentation/            # React presentation layer
│   ├── components/          # UI kit and application layout
│   ├── features/            # Dashboard feature modules
│   ├── hooks/               # Custom React hooks
│   ├── i18n/                # Internationalization
│   └── lib/                 # Display and utility helpers
│
├── app/                     # Application composition root
│   └── composition.ts       # Connects infrastructure to use cases
│
├── config/                  # Application policies and constants
│
└── test/                    # Test setup, fixtures and harness
```

### Architecture Documentation

Additional project documentation:

- `agent.md` — Architecture rules and development guidelines (Section 6).
- `design.md` — Visual system and UI design guidelines.
- `ASSUMPTIONS.md` — Decisions made where the original specification was incomplete.
- `QA_REPORT.md` — Bug resolutions, testing and verification results.

Important assumptions are also documented in the source code using `// ASSUMPTION:` comments.

## Restaurant Data Isolation

Nawy Orders operates as a multi-tenant platform. Each restaurant must access only the information and operations associated with its assigned restaurant context.

### Tenant Isolation Principles

- Restaurant data must remain isolated between tenants.
- Authenticated users must only access restaurants they are authorized to manage.
- Restaurant-scoped API operations must enforce the correct restaurant context.
- Access permissions must be validated by the backend, not only by the frontend.
- Data from one restaurant must never be exposed to another restaurant.

**Important:** Frontend route protection and UI permissions are not substitutes for backend authorization and tenant isolation.

## Backend Integration

The dashboard is designed to support switching from the mock provider to a real backend without changing feature components.

### API Contract

The application depends on a single `Api` interface defined in:

```text
src/application/dto.ts
```

The API implementation is connected through the composition root:

```text
src/app/composition.ts
```

Current mock configuration:

```typescript
export const api: Api = createMockApi(backend, {
  minDelayMs,
  maxDelayMs,
});

export const IS_MOCK_PROVIDER = true;
```

### Connecting a Real Backend

1. Create an HTTP API adapter, for example:

```text
src/infrastructure/http/http-api.ts
```

2. Implement the existing `Api` interface:

```typescript
import type { Api } from '@/application';

export const httpApi: Api = {
  // Implement the methods defined in the Api interface.
  // Connect each method to the corresponding backend endpoint.
};
```

3. Update `src/app/composition.ts` to use the HTTP adapter.

4. Set:

```typescript
export const IS_MOCK_PROVIDER = false;
```

5. Ensure every implementation matches the existing `Api` interface and preserves restaurant-level authorization and data isolation.

### Restaurant Context

All restaurant-scoped API operations must use the authenticated user's authorized restaurant context.

The backend must validate access to the requested restaurant and enforce tenant isolation for every relevant operation.

The frontend must not rely on a client-provided restaurant identifier as proof of authorization.

### Query Cache Invalidation

When implementing mutations, invalidate the relevant TanStack Query cache keys to keep restaurant information synchronized with the backend.

Cache invalidation should follow the existing query-key conventions defined by the application.

## Responsive Design

The dashboard supports desktop, tablet, and mobile layouts.

| Screen Size | Layout |
|---|---|
| 1280px and above | Full dashboard layout |
| 768px – 1279px | Collapsed sidebar with icon rail and tooltips |
| Below 768px | Off-canvas sidebar drawer |

### Mobile Navigation

The mobile navigation drawer:

- Opens through the top-bar hamburger button.
- Displays both icons and full navigation labels.
- Closes when tapping the backdrop.
- Closes when pressing `Escape`.
- Closes automatically after route navigation.
- Traps keyboard focus while open.

### RTL Readiness

The application uses logical CSS properties throughout the layout, including:

- `ms-*`
- `ps-*`
- `start-*`

This approach prepares the UI for future Arabic and RTL support without requiring major layout restructuring.

All English UI strings are centralized in:

```text
src/i18n/en.ts
```

## Development Guidelines

Before making changes, review the following files:

1. `agent.md` — Architecture and implementation rules.
2. `design.md` — UI consistency and design system.
3. `ASSUMPTIONS.md` — Existing business decisions.
4. `QA_REPORT.md` — Known issues and verification history.

**Important:** Maintain the separation between domain logic, application use cases, infrastructure adapters, and React presentation components when adding new features.

Always preserve restaurant-level data isolation, authorization rules, and existing application architecture when implementing new functionality.
# LTA-WMS — Frontend

Production-grade frontend for the **LTA Warehouse Management System**, built with
**Clean Architecture per Module** to mirror the backend's modular boundaries.

> Vite · React 19 · TypeScript · TailwindCSS v4 · shadcn/ui · TanStack Query · Zustand · React Hook Form · Zod · React Router 7

---

## 1. Architecture at a glance

The app is **module-first**. Cross-cutting code lives in `Shared/`; the app
composition root lives in `App/`; each business capability is a self-contained
module under `Modules/` with four internal layers:

```
Domain          Pure business model: Entities, Types, Constants. No ports here.
  └─ depended on by ▼
Application     Ports (Interfaces/), use cases, query/command hooks, module-local Zustand stores.
  └─ depended on by ▼
Infrastructure  Repositories (implement Application ports), DTOs, Mappers, endpoints.
Presentation    Pages, Components, Forms, Routes — UI logic only.
```

**Dependency rule:** dependencies point **inward**. `Domain` knows nothing of
the outer layers. Ports (`IXxxRepository`) are declared in `Application/Interfaces/`
and implemented by `Infrastructure` — mirroring the backend's Clean Architecture
per module. `Presentation` talks to `Application`, never to `Infrastructure` or
HTTP directly.

```
DTO  ──(Mapper)──►  Domain Entity  ──►  UseCase  ──►  Query/Command Hook  ──►  Component
   ▲  Infrastructure ▲                ▲  Application ▲                       ▲ Presentation
```

---

## 2. Complete folder tree

```
src/
├── App/                              # Composition root (no business logic)
│   ├── App.tsx
│   ├── Providers/
│   │   ├── AppProviders.tsx          # Error boundary → Theme → QueryClient → Toaster
│   │   └── ThemeProvider.tsx
│   ├── Router/
│   │   ├── AppRouter.tsx             # Aggregates module-owned routes
│   │   ├── DashboardPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── Layouts/
│   │   ├── AuthLayout.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── Components/{Sidebar,Topbar}.tsx
│   ├── Config/
│   │   ├── Env.ts                    # Zod-validated import.meta.env
│   │   ├── QueryClient.ts            # TanStack Query defaults
│   │   └── Routes.ts                 # Central route registry
│   └── Guards/
│       ├── ProtectedRoute.tsx
│       ├── RoleGuard.tsx
│       └── GuestRoute.tsx
│
├── Shared/                           # Reusable cross-module code ONLY
│   ├── Components/
│   │   ├── Ui/                       # shadcn/ui primitives (Button, Input, ...)
│   │   └── Feedback/{ErrorBoundary,Spinner}.tsx
│   ├── Hooks/UseDebouncedValue.ts
│   ├── Utils/Cn.ts
│   ├── Constants/QueryKeys.ts
│   ├── Types/{Api,Common}.ts
│   ├── Services/Http/{ApiClient,ApiError,TokenStorage}.ts
│   ├── Validations/                  # shared Zod schemas (cross-module)
│   └── Assets/
│
└── Modules/
    ├── Auth/                         # ✅ fully implemented
    │   ├── Domain/{Entities,Types,Constants}            # pure model — no ports
    │   ├── Application/{Interfaces,UseCases,Queries,Commands,Stores}  # Interfaces = ports
    │   ├── Infrastructure/{Api,Repositories,Mappers,Dtos}
    │   └── Presentation/{Pages,Components,Forms,Routes}
    ├── Inventory/                    # ✅ fully implemented (reference module)
    │   └── (same four-layer structure)
    ├── Warehouse/        ├── Inbound/        ├── Outbound/
    ├── Picking/          ├── Packing/        ├── Shipping/
    ├── StockTransfer/    ├── StockAdjustment/├── CycleCount/
    └── Reports/          # scaffold each by copying the Inventory module
```

`Auth` and `Inventory` are implemented end-to-end. The remaining modules follow
the **exact same four-layer shape** — see _§6 Adding a module_.

---

## 3. Path aliases

Configured in `tsconfig.app.json`, `tsconfig.json`, and `vite.config.ts`.

| Alias        | Resolves to     |
| ------------ | --------------- |
| `@/*`        | `src/*`         |
| `@app/*`     | `src/App/*`     |
| `@shared/*`  | `src/Shared/*`  |
| `@modules/*` | `src/Modules/*` |

---

## 4. Environment configuration

Copy `.env.example` → `.env` (or `.env.development` / `.env.production`).
All client-exposed vars are prefixed `VITE_` and validated at boot by
`App/Config/Env.ts` (the app **fails fast** on a bad config).

| Variable             | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `VITE_API_BASE_URL`  | Backend gateway base URL                                               |
| `VITE_API_PREFIX`    | Optional gateway API path prefix; empty for the current BE root routes |
| `VITE_API_TIMEOUT`   | Axios timeout (ms)                                                     |
| `VITE_APP_NAME`      | Display name                                                           |
| `VITE_APP_ENV`       | `development` \| `staging` \| `production`                             |
| `VITE_FEATURE_FLAGS` | Comma-separated feature flags                                          |

---

## 5. Yarn commands

```bash
yarn install          # install dependencies (Yarn 4 / Berry)
yarn dev              # start Vite dev server (http://localhost:5173)
yarn build            # type-check (tsc -b) then production build
yarn preview          # preview the production build locally
yarn typecheck        # TypeScript only, no emit
yarn lint             # ESLint (0 warnings allowed)
yarn lint:fix         # ESLint with autofix
yarn format           # Prettier write
yarn format:check     # Prettier check (CI)
yarn test             # Vitest (run)
yarn test:watch       # Vitest (watch)
```

After `yarn install`, add shadcn/ui primitives via the CLI (aliases are set in
`components.json`):

```bash
yarn dlx shadcn@latest add dialog dropdown-menu select
```

---

## 6. Adding a module

1. Copy `Modules/Inventory/` → `Modules/<NewModule>/`.
2. Rename Domain entities, ports, DTOs, mappers, repository, use cases.
3. Add a query-key namespace in `Shared/Constants/QueryKeys.ts`.
4. Export a `*Routes` array from `Presentation/Routes/`.
5. Register the routes in `App/Router/AppRouter.tsx` and a nav entry in
   `App/Layouts/Components/Sidebar.tsx`.

Modules never import one another's internals — share only through `Shared/` or
by aggregating routes/types at the `App/` layer.

---

## 7. Coding standards

### Naming

- **Folders, Components, Pages, Types, Interfaces, Classes, UseCases:** `PascalCase`
- **Files:** `PascalCase.ts` / `PascalCase.tsx` (e.g. `GetInventoryListUseCase.ts`)
  - _Exception:_ shadcn/ui primitives under `Shared/Components/Ui` keep the
    library's own filenames managed by its CLI.
- **React hooks:** `useXxx.ts` (`useAuth.ts`, `useInventory.ts`)
- **Variables / functions:** `camelCase`
- **Constants:** `UPPER_SNAKE_CASE`

### Architecture rules (enforced by review + ESLint `no-restricted-imports`)

1. React components contain **UI logic only**.
2. Business logic stays in the **Application** layer (use cases / hooks).
3. API calls stay in the **Infrastructure** layer (repositories).
4. **Domain** must not import React, Axios, Zustand, or UI libraries.
5. `Shared/` holds only reusable, cross-module code.
6. **No global monolithic Zustand store** — stores are module-local.
7. A module owns its local client state when needed.
8. **TanStack Query** for server state.
9. **Zustand** for client state only.
10. **React Hook Form + Zod** for all forms (schema is the source of truth).
11. **Repository Pattern** for data access.
12. **DTO → Mapper → Domain Entity** at every transport boundary.
13. Keep modules independent.

### State ownership

| Kind                          | Tool                   |
| ----------------------------- | ---------------------- |
| Server data (lists, entities) | TanStack Query         |
| Auth identity / UI filters    | Zustand (module-local) |
| Form state                    | React Hook Form + Zod  |
| Theme / global UI             | React Context (`App/`) |

### Imports & conventions

- Always use path aliases; never deep relative `../../../`.
- Type-only imports use `import type { ... }` (`verbatimModuleSyntax` on).
- Reference routes through `App/Config/Routes.ts`, never hard-coded strings.
- Query keys come from each module's `*QueryKeys.ts`, never inline arrays.
- Errors are normalised to `ApiError` in the HTTP layer; UI matches on it.

---

## 8. Reference implementations (where to look)

| Concern                     | File                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| Axios client + interceptors | `Shared/Services/Http/ApiClient.ts`                                    |
| Repository Pattern          | `Modules/Inventory/Infrastructure/Repositories/InventoryRepository.ts` |
| UseCase Pattern             | `Modules/Inventory/Application/UseCases/GetInventoryListUseCase.ts`    |
| DTO → Mapper → Entity       | `Modules/Inventory/Infrastructure/Mappers/InventoryMapper.ts`          |
| RHF + Zod form              | `Modules/Inventory/Presentation/Forms/AdjustQuantityForm.tsx`          |
| Zustand (client state)      | `Modules/Auth/Application/Stores/AuthStore.ts`                         |
| Protected route             | `App/Guards/ProtectedRoute.tsx`                                        |
| Module routes aggregation   | `App/Router/AppRouter.tsx`                                             |

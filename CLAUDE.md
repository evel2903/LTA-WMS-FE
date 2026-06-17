# CLAUDE.md — LTA-WMS Frontend

Guidance for Claude Code when working in this repo. Read this before editing.

## What this is

Frontend for the **LTA Warehouse Management System**. **Clean Architecture per
Module**, module-first, intended to mirror a backend that is also Clean
Architecture per module.

**Stack:** Vite 6 · React 19 · TypeScript (strict) · Tailwind **v4** · shadcn/ui
(new-york) · TanStack Query v5 · Zustand v5 · React Hook Form + Zod · React
Router 7. Package manager: **Yarn 4** (but `node_modules` is present and `npx`
works for one-off checks).

## Commands

```bash
yarn dev          # Vite dev server (http://localhost:5173, proxies /api → backend)
yarn build        # tsc -b then vite build
yarn typecheck    # tsc -b --noEmit  ← run this after any non-trivial change
yarn lint         # eslint, 0 warnings allowed
yarn format       # prettier write
```

When deps aren't installed via yarn, `npx tsc -b --noEmit` still works for a quick typecheck.

## Git

**Never commit or push automatically.** Run `git commit`/`git push` only when the user explicitly asks. Finishing a task means leaving the changes ready for review, not committing them. Never amend/rebase/force-push without an explicit request.

## Layered architecture (the core rule)

Each module under `src/Modules/<Name>/` has four layers; **dependencies point inward**:

```
Domain          Pure model: Entities, Types, Constants. NO interfaces/ports here.
                NO react/axios/zustand/@tanstack/UI imports. EVER.
  ▲ Application      Ports (Interfaces/) + use cases (classes) + query/command hooks + module-local Zustand.
  ▲ Infrastructure   Repositories implement Application ports; DTOs; Mappers; endpoints.
  ▲ Presentation     Pages, Components, Forms, Routes — UI logic ONLY.
```

Data flow: **DTO → Mapper → Domain Entity → UseCase → Query/Command hook → Component.**

**Ports live in `Application/Interfaces/`, NOT in Domain** — this mirrors the backend's Clean Architecture per module (verified in LTA-WMS-BE: `Modules/*/Application/Interfaces/I*Repository.ts`, with Domain holding only Entities + ValueObjects). Hexagonal style: the use case owns the contract it depends on; Infrastructure implements it. The interface may import Domain entities (Application → Domain is the correct direction).

Non-negotiables (ESLint `no-restricted-imports` guards the Domain boundary):
- Components contain UI logic only. Business logic lives in Application use cases.
- All HTTP lives in Infrastructure repositories. Never call axios/`httpClient` from a component or page.
- Domain never imports a framework, and holds no ports/interfaces. If you need React/Axios/Zustand, you're in the wrong layer.
- Server state → **TanStack Query**. Client state → **Zustand (module-local, never global)**. Forms → **RHF + Zod**.
- Repositories implement an **Application port** (`Application/Interfaces/IXxxRepository.ts`) and take an injectable `HttpClient` (constructor default = singleton `httpClient`) so they're testable. Use `IXxxRepository` for entity access; `IXxxService`/`IXxxGateway` for non-CRUD/RPC capabilities — both live in `Application/Interfaces/`.
- A `UseXxxUseCase.ts` (PascalCase) is a class; the `useXxx.ts` hook is its React adapter that wires it to Query/Zustand.

## Naming (enforced by review)

- **Folders, Components, Pages, Types, Interfaces, Classes, UseCases, files:** `PascalCase` (`GetInventoryListUseCase.ts`, `InventoryTable.tsx`).
- **React hooks:** `useXxx.ts` camelCase.
- **Variables/functions:** `camelCase`. **Constants:** `UPPER_SNAKE_CASE`.
- **Exception:** shadcn/ui primitives in `src/Shared/Components/Ui/` follow the library's filenames.
- Always import via aliases — never deep relative paths. Use `import type` for types (`verbatimModuleSyntax` is on).

## Path aliases

`@/*`→`src/*` · `@app/*`→`src/App/*` · `@shared/*`→`src/Shared/*` · `@modules/*`→`src/Modules/*`
(declared in `tsconfig.app.json`, `tsconfig.json`, and `vite.config.ts` — keep all three in sync).

## Backend API contract (CRITICAL — read `Auth-Integration-FE.md`)

The backend is **NOT** a typical bearer-token API. Get this wrong and auth breaks subtly.

- **Envelope is PascalCase:** success `{ "Success": true, "Data": {...} }`, error `{ "Success": false, "Errors": [{ "Code", "Message" }] }`. The HTTP client unwraps `Data`; `ApiError.fromBody` reads `Errors[0]`. Error codes: `VALIDATION|UNAUTHORIZED|FORBIDDEN|NOT_FOUND|CONFLICT|BUSINESS_RULE|UNKNOWN`.
- **JWT lives in HttpOnly cookies.** JavaScript cannot read/set tokens. So:
  - **Never** store tokens in localStorage/sessionStorage. **Never** add an `Authorization` header. There is no `TokenStorage` — do not reintroduce one.
  - Every request MUST send cookies → the axios instance sets `withCredentials: true`. Keep it.
  - Login state is known only by calling `GET /auth/me` (done once at boot by `useAuthBootstrap`) or from a login/register/refresh response.
- **Single-flight refresh is mandatory.** Refresh tokens rotate and the old one is revoked; parallel `/auth/refresh` calls trigger server-side reuse detection that kills ALL sessions. The interceptor in [ApiClient.ts](src/Shared/Services/Http/ApiClient.ts) serialises refresh through one shared promise — **do not** change it to fire per-request.
- **Auth endpoints are at the host root** (`http://host/auth/...`), outside the `/api/v1` WMS prefix. The repository passes `AUTH_REQUEST_CONFIG` (`baseURL: ENV.apiBaseUrl`) to escape the prefix. WMS module endpoints use the prefixed base.
- **Roles are `'User' | 'Admin'`** (PascalCase). `POST`s return **201**, not 200. `/auth/me` returns `UserId` (not `Id`) — handled in `AuthMapper.fromMe`.

## Reference implementations (copy these patterns)

| Concern | File |
|---|---|
| Axios client + cookie refresh + envelope unwrap | `src/Shared/Services/Http/ApiClient.ts` |
| Normalised error | `src/Shared/Services/Http/ApiError.ts` |
| Repository pattern | `src/Modules/Inventory/Infrastructure/Repositories/InventoryRepository.ts` |
| UseCase pattern | `src/Modules/Inventory/Application/UseCases/GetInventoryListUseCase.ts` |
| DTO → Mapper → Entity | `src/Modules/*/Infrastructure/Mappers/*Mapper.ts` |
| Query/Command hooks + query keys | `src/Modules/Inventory/Application/{Queries,Commands}/` |
| RHF + Zod form (schema = source of truth) | `src/Modules/Auth/Presentation/Forms/LoginForm.tsx` |
| Module-local Zustand (no tokens, no persist) | `src/Modules/Auth/Application/Stores/AuthStore.ts` |
| Auth boot / session-expiry wiring | `src/Modules/Auth/Application/UseCases/UseAuthBootstrap.ts`, `UseSessionExpiry.ts` |
| Guards | `src/App/Guards/{ProtectedRoute,RoleGuard,GuestRoute}.tsx` |
| Route aggregation | `src/App/Router/AppRouter.tsx` |

## Implementation status

- **Auth** — fully implemented and integrated against the real backend (cookie model above).
- **Inventory** — fully implemented as the reference WMS module (its endpoints are assumed, not yet confirmed against a live backend).
- **Warehouse, Inbound, Outbound, Picking, Packing, Shipping, StockTransfer, StockAdjustment, CycleCount, Reports** — not built. Scaffold each by copying the Inventory module's four-layer shape.

## Adding a module (recipe)

1. Copy `src/Modules/Inventory/` → `src/Modules/<NewModule>/`, rename entities/ports/DTOs/mappers/repo/use cases.
2. Add a query-key namespace in `src/Shared/Constants/QueryKeys.ts`; build module keys off it (`*QueryKeys.ts`).
3. Add path(s) to `src/App/Config/Routes.ts` — never hard-code route strings elsewhere.
4. Export a `*Routes` array from `Presentation/Routes/`; register it in `AppRouter.tsx` and add a nav item in `src/App/Layouts/Components/Sidebar.tsx`.
5. Modules must not import each other's internals — share only via `@shared/*` or by aggregating at `@app/*`.

## Gotchas

- **Tailwind v4**: no `tailwind.config.js`. Theme tokens are CSS variables in `src/index.css` via `@theme inline`; the `@tailwindcss/vite` plugin is the engine.
- **tsconfig**: `baseUrl` is required for path aliases (an IDE may warn it's deprecated — the installed TS 5.7 still needs it). Do **not** re-add `exactOptionalPropertyTypes` or `erasableSyntaxOnly` — they were removed because they break shadcn/sonner/RHF types and don't exist in TS 5.7.
- After non-trivial edits, run `yarn typecheck` (or `npx tsc -b --noEmit`) before claiming done.
- `Errors`/`Success`/`Data` are PascalCase on the wire but Domain entities are camelCase — the Mapper is the only place both shapes coexist. Keep it that way.

## Env

`.env.development` (committed). Copy `.env.example` for new envs. `VITE_API_BASE_URL` is the host root; `VITE_API_PREFIX` (`/api/v1`) applies to WMS endpoints only. `App/Config/Env.ts` validates env with Zod and fails fast on misconfig.

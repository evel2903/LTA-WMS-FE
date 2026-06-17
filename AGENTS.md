# AGENTS.md — LTA-WMS Frontend (Codex CLI execution rules)

Operating rules for modifying this repo. These are mandatory, not advisory.
On any conflict, defer to `CLAUDE.md`; this file is its enforcement form.

---

## 0. Before you touch code

- Identify the **module** (`src/Modules/<Name>/`) and the **layer** (`Domain` / `Application` / `Infrastructure` / `Presentation`) you are editing. State it.
- Find the matching reference implementation (§ Reference map) and mirror its pattern. Do not invent new patterns.
- Never add a dependency without an explicit reason; prefer what's already in `package.json`.

## 1. Architecture constraints (hard fail if violated)

Dependencies point inward: `Domain ← Application ← Infrastructure ← Presentation`.

- **Domain**: pure TypeScript only. MUST NOT import `react`, `react-dom`, `axios`, `zustand`, `@tanstack/*`, or any UI lib. No I/O.
- **Application**: use cases are classes (`*UseCase.ts`) depending only on Domain ports. React adapters are hooks (`useXxx.ts`) that wire a use case to TanStack Query / Zustand.
- **Infrastructure**: all HTTP lives here. Repositories implement a Domain port (`IXxxRepository`) and take an injectable `HttpClient` (default = singleton `httpClient`). DTO↔Domain conversion happens ONLY in `*Mapper.ts`.
- **Presentation**: UI logic only. MUST NOT call `httpClient`/axios, contain business rules, or import from `Infrastructure/Dtos`.
- State: server state → TanStack Query; client state → Zustand (**module-local only, never a global store**); forms → React Hook Form + Zod.
- Data flow is always: `DTO → Mapper → Domain Entity → UseCase → Query/Command hook → Component`.

If a task seems to require breaking a layer rule, stop and surface it instead of violating it.

## 2. Backend/API rules (breaking these silently corrupts auth)

- Wire envelope is PascalCase: success `{ Success, Data }`, error `{ Success, Errors:[{Code,Message}] }`. Unwrap via `httpClient` (returns `Data`); build errors via `ApiError.fromBody`. Never hand-parse envelopes elsewhere.
- Auth is **HttpOnly-cookie** based:
  - NEVER store tokens (no localStorage/sessionStorage), NEVER add an `Authorization` header, NEVER reintroduce `TokenStorage`.
  - Keep `withCredentials: true` on the axios instance.
  - Login state comes only from `GET /auth/me` (`useAuthBootstrap`) or login/register/refresh responses.
- Refresh MUST stay **single-flight** (one shared promise in `ApiClient.ts`). Do not make refresh per-request.
- Auth endpoints are at host root via `AUTH_REQUEST_CONFIG`; WMS endpoints use the `/api/v1` prefix. Don't mix them.
- Roles are `'User' | 'Admin'`. `/auth/me` returns `UserId` (mapped in `AuthMapper.fromMe`). POSTs return 201.

## 3. Coding standards

- Naming: `PascalCase` for folders/files/components/pages/types/interfaces/classes/use cases; `useXxx.ts` for hooks; `camelCase` vars/functions; `UPPER_SNAKE_CASE` constants. Exception: shadcn/ui files in `src/Shared/Components/Ui/`.
- Imports: use aliases `@/ @app/ @shared/ @modules/` — no deep relative paths. Use `import type` for type-only imports (`verbatimModuleSyntax` is on).
- Routes: reference `src/App/Config/Routes.ts`; never hard-code path strings. Query keys come from a module `*QueryKeys.ts` built on `Shared/Constants/QueryKeys.ts`; no inline key arrays.
- TS config: do NOT re-add `exactOptionalPropertyTypes` or `erasableSyntaxOnly`. Keep `baseUrl` (needed for aliases). Class overrides need the `override` modifier.
- Tailwind v4: no `tailwind.config.js`; theme tokens live in `src/index.css`.

## 4. Implementation workflow

1. Scope: name the module + layer; read the reference file for that concern.
2. Edit inward-out: Domain types/ports → Mapper/Repository → UseCase → hook → Component.
3. Keep aliases in sync across `tsconfig.app.json`, `tsconfig.json`, `vite.config.ts` if you add one.
4. Adding a module: copy `src/Modules/Inventory/`, rename, add query-key namespace, add route to `Routes.ts`, export `*Routes`, register in `AppRouter.tsx` + `Sidebar.tsx`. Don't import another module's internals.
5. Make the smallest change that satisfies the task; don't refactor unrelated code.

## 5. Testing & verification (required before "done")

- Run `yarn typecheck` (or `npx tsc -b --noEmit`) — MUST pass with zero errors.
- Run `yarn lint` — MUST pass with zero warnings (`--max-warnings=0`).
- If touching the API/auth layer, re-read `Auth-Integration-FE.md` and confirm §2 still holds.
- Do not run `yarn build` to "verify" unless a build issue is in scope; typecheck + lint is the gate.
- State what you ran and the actual result. If a check fails or was skipped, say so — never claim success unverified.

## 6. Completion criteria (all must be true)

- [ ] Change confined to the correct module/layer; no inward-dependency or layer violation.
- [ ] No tokens stored, no `Authorization` header, `withCredentials` intact, refresh still single-flight.
- [ ] Naming, aliases, `import type`, route/query-key conventions followed.
- [ ] `yarn typecheck` and `yarn lint` pass; results reported.
- [ ] No unrelated/incidental edits; no new deps without justification.

## Reference map

| Concern | File |
|---|---|
| HTTP client, cookie refresh, unwrap | `src/Shared/Services/Http/ApiClient.ts` |
| Error normalisation | `src/Shared/Services/Http/ApiError.ts` |
| Repository | `src/Modules/Inventory/Infrastructure/Repositories/InventoryRepository.ts` |
| UseCase | `src/Modules/Inventory/Application/UseCases/GetInventoryListUseCase.ts` |
| Mapper (DTO↔Entity) | `src/Modules/*/Infrastructure/Mappers/*Mapper.ts` |
| Query/Command hooks | `src/Modules/Inventory/Application/{Queries,Commands}/` |
| RHF + Zod form | `src/Modules/Auth/Presentation/Forms/LoginForm.tsx` |
| Module-local store | `src/Modules/Auth/Application/Stores/AuthStore.ts` |
| Auth boot/expiry | `src/Modules/Auth/Application/UseCases/UseAuthBootstrap.ts`, `UseSessionExpiry.ts` |
| Guards / routing | `src/App/Guards/`, `src/App/Router/AppRouter.tsx` |

## Status (don't assume beyond this)

Auth = done, integrated against the real cookie backend. Inventory = done, reference module (its endpoints are assumed, unverified against a live backend). Other 10 modules = not built; scaffold from Inventory.

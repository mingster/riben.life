# Agent instructions – riben.life web

This file is the single entry point for AI agents working on this repo. Full detail lives in `.cursor/rules/*.mdc` (Cursor applies those automatically). Use this doc for context and critical conventions.

---

## Project overview

- **Stack:** Next.js 15+ (App Router), React 19, TypeScript, Prisma, Tailwind v4, shadcn/ui, Better Auth, Bun.
- **App root:** `web/src`. Main app in `src/app/`; server actions in `src/actions/`.
- **Docs:** `/doc/` for guides; `.cursor/rules/` for Cursor-specific rules; `.cursor/plans/` for design/plans.

---

## Package manager

- Use **Bun** only: `bun install`, `bun add <pkg>`, `bun run dev` / `bun run build`. Keep `bun.lock`; do not use npm/yarn/pnpm for installs.

---

## Project structure

- **Routes:** `src/app/` — `(root)`, `(auth)`, `s/[storeId]`, `storeAdmin`, `sysAdmin`, `api/`.
- **Actions:** `src/actions/` by domain (e.g. `storeAdmin/tables/`, `store/waitlist/`). Naming: `verb-object.ts`, validation in `verb-object.validation.ts`.
- **Components:** `src/components/` (UI in `components/ui/`). **Do not use `mingster.backbone`** — only local imports from `@/components/`, `@/lib/`, etc.
- **Naming:** kebab-case for files/dirs; PascalCase for components; named exports preferred.

---

## Prisma & database

- **Schema:** `prisma/schema.prisma`. All **datetime fields are `BigInt`** (epoch milliseconds). No `DateTime`, no `@default(now())`; set timestamps in code with `getUtcNowEpoch()` from `@/utils/datetime-utils`.
- **Reading/writing:** Use `epochToDate()` / `dateToEpoch()` and store timezone helpers in `@/utils/datetime-utils` for display and persistence.
- **JSON from Prisma:** Before `JSON.stringify()` or sending to client, call `transformPrismaDataForJson(data)` (`@/utils/utils`) so BigInt/Decimal serialize.

---

## Server actions

- **Wrapper:** next-safe-action with `baseClient`, `storeActionClient`, `adminActionClient`, `userRequiredActionClient`. Use the one that matches the route (store admin → `storeActionClient`, etc.).
- **storeActionClient:** First argument is `storeId` (bound); do **not** put `storeId` in the Zod schema. Call as `action(storeId, { ...input })`.
- **Validation:** Zod schemas in `*.validation.ts` next to the action. **Reuse the same schema in forms** — do not define duplicate schemas in components.
- **Errors:** Throw `SafeError` for user-facing errors; use `getT()` from `@/app/i18n` for messages.

---

## CRUD & client state

- **Pattern:** Page (server) fetches data → passes to client component → client holds list in `useState`. After create/update/delete, update that state directly (e.g. `setData(prev => [...])`); **do not** rely on `router.refresh()` for list/table data.
- **Edit/create:** Dedicated dialog component; react-hook-form + Zod; import schema from action’s validation file; on success call parent callback to update state.
- **Reference:** Store admin tables: `client-table.tsx`, `edit-table-dialog.tsx`, `cell-action.tsx`. SysAdmin users: `edit-user.tsx` as canonical edit form.

---

## Data fetching

- **Server components:** Fetch in the page/layout.
- **Client:** Prefer **SWR** for GETs; use **server actions** for mutations. After mutations, update local state as above; use `result?.serverError` and `toastError` / `toastSuccess`.

---

## Forms

- React Hook Form + Zod; `zodResolver(schema)`; schema from action validation. Use `mode: "onChange"` for live validation.
- **Submission:** Show a loading overlay and disable primary actions until the request finishes. Use `logger` (not `console`) on the server.

---

## UI & components

- **Icons:** `@tabler/icons-react` (e.g. `IconPlus`, `IconTrash`). Use `lucide-react` only if needed.
- **Tables:** Use `DataTable`, `DataTableCheckbox`, `DataTableColumnHeader` from `@/components/dataTable*`. Reference: store admin tables and FAQ category.
- **Mobile:** Touch targets at least 44×44px; use `touch-manipulation`; responsive spacing (e.g. `px-3 sm:px-4 lg:px-6`). Menu items: use `h-11` (44px), not `min-h-[44px]`.

---

## i18n

- **Keys:** **snake_case only** (e.g. `waitlist_session_morning`, `store_settings_use_order_system`). Add to `src/app/i18n/locales/{en,tw,jp}/translation.json` (and `marketing.json` where applicable).

---

## Logging

- Backend: `import logger from "@/lib/logger"`. Use `logger.info/warn/error` with structured `metadata`. Do not log secrets. In catch blocks use `err instanceof Error ? err.message : String(err)`.

---

## Builds

- **Do not run `build`** for routine edits (components, actions, styles, docs). Run build after schema/tsconfig/dependency changes or when the user asks. Prefer `bun run lint` or IDE type-check for quick feedback.

---

## Misc

- **Zod:** Use Zod v4; import from `"zod"`.
- **Select empty value:** Use `"--"` (or similar) for “none”, not `""`; map back to `null` in `onValueChange`.
- **Git:** Commit only when asked; short message (<50 chars); use `git add -a && git commit -m "..."`.

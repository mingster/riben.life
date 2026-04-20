# Agent instructions (riben.life)

This file is the **canonical** guide for **Cursor**, **Claude Code**, and other agents. Root [`CLAUDE.md`](CLAUDE.md) is a one-line pointer to this file (`@AGENTS.md`).

## Workspace paths

- **Repository root** contains **`web/`** (Next.js app), `asset/`, `.cursor/`, `.claude/`, etc.
- **Package scripts** (`bun run dev`, Prisma, etc.) live under **`web/`** — run them from `web/` (or `cd web` from the repo root).
- If your editor **workspace root is `web/`**, paths like `src/...` mean **`web/src/...`**. **`web/.cursor`** symlinks to **`../.cursor`**, so Cursor rules match a repo-root checkout.
- **`web/AGENTS.md`** is a **symlink** to **`../AGENTS.md`** (single copy on disk). On Windows, enable Git symlink support (`core.symlinks=true`) or Developer Mode if the link does not appear.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

Cursor applies [`.cursor/rules/*.mdc`](.cursor/rules) automatically; use this document for overview and conventions not covered there.

## Project Overview

riben.life is an online shopping platform for customizable product personalization, similar to Longchamp's Pliage system or LV. The key differentiator is the **riben.life pattern** (located in `asset/pattern.jpg`) which serves as the material/design for personalized products.

The codebase is bootstrapped from [riben.life](https://github.com/mingster/riben.life), a multi-tenant restaurant management platform. For riben.life, the architecture is adapted for product customization and e-commerce rather than food ordering.

examples:

- [LV](https://tw.louisvuitton.com/zht-tw/products/noe-mon-monogram-monogram-nvprod7310311v/P01895)
- [LONGCHAMP](https://www.longchamp.com/tw/zh/mypliagev2/?guid=mypliage_L1624461IT_0&tab=body)

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Runtime**: Bun (package manager and runtime)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: Better Auth (email, magic link, OAuth, passkeys)
- **UI Framework**: Tailwind CSS v4 + Shadcn UI + Radix UI components
- **Forms**: React Hook Form + Zod validation
- **Linting**: Biome (formatting and linting)
- **Payments**: Stripe and LINE Pay
- **Internationalization**: next-intl (i18n support)

## Development Commands

Run from **`web/`** (where `package.json` defines scripts).

### Setup

```bash
cd web

# Install dependencies
bun install

# Generate Prisma client
bun run sql:generate

# Push schema to database (development)
bun run sql:dbpush

# Initialize platform (run once after DB setup)
bun run install:platform
```

### Development

```bash
cd web

# Start dev server (port 3001)
bun run dev

# Alternative Node.js runtime
bun run dev:node

# Debug mode with Node inspector
bun run debugdev

# Format code with Biome
bun run format

# Lint and fix code
bun run lint

# Type checking
tsc --noEmit
```

### Build & Deployment

```bash
cd web

# Standard build
bun run build

# Production build
bun run build:production

# Start production server
bun start

# Analysis and optimization variants
bun run build:perf
bun run build:analyze
bun run build:fast
bun run build:optimized
```

### Database

```bash
cd web

# Push schema changes (development)
bun run sql:dbpush

# Create migration (production)
bunx prisma migrate dev --name <migration_name>

# Open Prisma Studio (GUI for database)
bunx prisma studio
```

### Testing

```bash
cd web

# Run all tests
bun test

# Type check tests
bun run type-check:test
```

## Project Structure

```
/web (from riben.life, adapted for riben.life)
├── bin/                    # Build and utility scripts
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets
│   ├── images/            # UI and brand images
│   ├── favicons/          # Favicon assets
│   └── install/           # Installation data (countries, currencies, locales)
└── src/
    ├── actions/           # Server actions (organized by domain)
    │   ├── product/       # Product customization actions
    │   ├── order/         # Order management
    │   ├── user/          # User account operations
    │   ├── payment/       # Payment processing
    │   └── mail/          # Email operations
    ├── app/               # Next.js App Router pages
    │   ├── (root)/        # Public pages (home, product, checkout, account)
    │   ├── api/           # API endpoints and webhooks
    │   ├── admin/         # Admin dashboard
    │   └── designer/      # Product designer/customizer interface
    ├── components/        # Reusable UI components
    │   ├── ui/           # Shadcn UI component wrappers
    │   ├── product/      # Product-specific components
    │   └── designer/     # Customizer UI components
    ├── hooks/            # Custom React hooks
    ├── lib/              # Core utilities and integrations
    │   ├── auth.ts       # Authentication logic
    │   ├── prismadb.ts   # Database client
    │   ├── payment/      # Payment plugins; `stripe/`, `paypal/`, `linePay/`
    ├── providers/        # React context providers
    ├── types/            # TypeScript type definitions
    └── utils/            # Helper functions
```

## Architecture Patterns

### Data Flow

1. **Server Components** (default): Fetch data on the server for optimal performance
2. **Server Actions**: Handle mutations with type-safe validation using Zod
3. **Client Components** (use `'use client'`): Interactive UI elements with local state
4. **URL State**: Shareable state via URL search params with `nuqs`

### Code Organization

- **Files**: Use `kebab-case` for filenames, `PascalCase` for React components
- **Imports**: Use `@/` alias for absolute imports from src
- **Component Size**: Keep files under 300 lines when possible
- **Validation**: Collocate Zod schemas in `*.validation.ts` files
- **Icons**: Standardized on `@tabler/icons-react`

### Server Actions Pattern

Use the `next-safe-action` wrapper with appropriate clients:

```typescript
// In src/actions/[domain]/your-action.ts
import { baseClient, userRequiredActionClient, adminActionClient } from "@/lib/safe-action"
import { z } from "zod"

const schema = z.object({ /* validation */ })

export const yourAction = baseClient
  .schema(schema)
  .action(async ({ parsedInput }) => {
    // Type-safe implementation
  })
```

### Form Handling

Combine React Hook Form + Zod for client and server validation:

```typescript
const form = useForm({
  resolver: zodResolver(YourSchema),
  defaultValues: {},
})

const onSubmit = async (data) => {
  const result = await yourAction(data)
  if (result.success) {
    // Handle success
  }
}
```

## Next.js app conventions (`web/`)

Paths below are under **`web/`** unless prefixed with `web/`. **`@/`** maps to `web/src/`.

### Package manager

Use **Bun** only: `bun install`, `bun add <pkg>`, `bun run dev` / `bun run build`. Keep `bun.lock`; do not use npm/yarn/pnpm for installs.

### Routes and code layout

- **Routes:** `src/app/` — `(root)`, `(auth)`, `s/[storeId]`, `storeAdmin`, `sysAdmin`, `api/`.
- **Store admin layouts:** Under `storeAdmin/(dashboard)/[storeId]/`, keep **one** layout file (`[storeId]/layout.tsx`) for shell + access. The `(routes)/` folder groups pages only — **never** add `storeAdmin/.../[storeId]/(routes)/layout.tsx` again (nested route-group layout caused dev 404s on paths like `notifications/history`).
- **Actions:** `src/actions/` by domain (e.g. `storeAdmin/tables/`, `store/waitlist/`). Naming: `verb-object.ts`, validation in `verb-object.validation.ts`.
- **Components:** `src/components/` (UI in `components/ui/`). **Do not use `mingster.backbone`** — only local imports from `@/components/`, `@/lib/`, etc.
- **Naming:** kebab-case for files/dirs; PascalCase for components; named exports preferred.

### Prisma and database

- **Schema:** `prisma/schema.prisma`. All **datetime fields are `BigInt`** (epoch milliseconds). No Prisma `DateTime`, no `@default(now())`; set timestamps with `getUtcNowEpoch()` from `@/utils/datetime-utils`.
- **Reading/writing:** Use `epochToDate()` / `dateToEpoch()` and timezone helpers from `@/utils/datetime-utils` for display and persistence.
- **JSON from Prisma:** Before `JSON.stringify()` or sending to the client, call `transformPrismaDataForJson(data)` (`@/utils/utils`) so `BigInt`/`Decimal` serialize.

### Server actions (next-safe-action)

- Use **`baseClient`**, **`storeActionClient`**, **`adminActionClient`**, **`userRequiredActionClient`** — pick the client that matches the route (e.g. store admin → `storeActionClient`).
- **`storeActionClient`:** first bound argument is **`storeId`**; do **not** include `storeId` in the Zod schema. Call as `action(storeId, { ...input })`.
- **Validation:** Zod in `*.validation.ts` next to the action. **Reuse the same schema in forms** — do not duplicate schemas in components.
- **Errors:** throw **`SafeError`** for user-facing errors; use `getT()` from `@/app/i18n` for messages.

### CRUD and client state

- **Pattern:** Server page fetches data → client component holds the list in `useState`. After create/update/delete, update that state directly; **do not** rely on `router.refresh()` for list/table data.
- **Edit/create:** dialog + react-hook-form + Zod; import schema from the action validation file; on success, call the parent callback.
- **References:** store admin tables (`client-table.tsx`, `edit-table-dialog.tsx`, `cell-action.tsx`); sysadmin **`edit-user.tsx`** as canonical edit form.

### Data fetching

- **Server components:** fetch in the page/layout.
- **Client:** prefer **SWR** for GETs; **server actions** for mutations. After mutations, update local state; check `result?.serverError` and use `toastError` / `toastSuccess`.

### Forms

- React Hook Form + Zod; `zodResolver(schema)`; **`mode: "onChange"`** for live validation where appropriate.
- **Submission:** show a loading overlay and disable primary actions until the request finishes. On the server use **`logger`**, not `console.log`.

### UI and components

- **Icons:** `@tabler/icons-react` (e.g. `IconPlus`, `IconTrash`). Use `lucide-react` only if needed.
- **Tables:** `DataTable`, `DataTableCheckbox`, `DataTableColumnHeader` from `@/components/dataTable*`. See store admin tables and FAQ category.
- **Mobile:** touch targets at least 44×44px; `touch-manipulation`; responsive spacing. Menu items: **`h-11` (44px)**, not `min-h-[44px]`.

### Internationalization

- **Keys:** **snake_case** (e.g. `waitlist_session_morning`, `store_settings_use_order_system`). Add to `src/app/i18n/locales/{en,tw,jp}/translation.json` (and `marketing.json` where applicable).

### Logging

- Backend: `import logger from "@/lib/logger"`. Use structured `metadata`. Do not log secrets. In `catch` blocks: `err instanceof Error ? err.message : String(err)`.

### Builds

- **Do not run `build`** for routine edits (components, actions, styles, docs). Run build after schema/tsconfig/dependency changes or when the user asks. Prefer `bun run lint` or IDE type-check for quick feedback.

### Misc

- **Zod:** v4; `import { z } from "zod"`.
- **Select empty value:** use `"--"` (or similar) for “none”, not `""`; map to `null` in `onValueChange`.
- **Git:** commit only when asked; short message (under 50 characters); `git add -a && git commit -m "..."` per project convention.

## Role-Based Access Control (RBAC)

The platform uses role-based access:

- `user` - Regular customers (product purchasers)
- `owner` - Store/shop owner
- `staff` - Store staff members
- `storeAdmin` - Store administrators
- `sysAdmin` - System administrators

Access is enforced in:

- Server actions (using `userRequiredActionClient`, `adminActionClient`)
- Route handlers (via middleware)
- Component rendering (conditional based on session)

## Key Customization Points for riben.life

Since riben.life is adapted from riben.life (restaurant ordering), focus on these areas:

### Replace Restaurant Concepts With E-commerce

- `Store` → Shop/Storefront
- `Menu/Products` → Customizable product catalog
- `Orders` → Customer purchases with personalization options
- `Queue System` → Wishlist/saved designs
- `Reservation` → Pre-orders for customized items

### Product Customization Features

- **Designer Interface** (`src/components/designer/`): Interactive product customizer where users apply the riben.life pattern
- **Variant Management**: Product options (colors, sizes, pattern positioning)
- **Cart System**: Persist customized product configurations
- **Order Tracking**: Track personalized product production and shipping

### Assets

The riben.life pattern is located at `/asset/pattern.jpg`. This should be:

- Imported in product customization components
- Made available for pattern selection in the designer interface
- Applied to product previews dynamically

## Database Considerations

The database schema is managed in [`web/prisma/schema.prisma`](web/prisma/schema.prisma). When modifying:

1. Update the schema file under **`web/prisma/`**
2. Run `bun run sql:generate` from **`web/`** to regenerate the Prisma client
3. For development: `bun run sql:dbpush` to push changes
4. For production: create migrations with `bunx prisma migrate dev --name your_migration_name` (from **`web/`**)

Datetime fields use **BigInt epoch ms** — see **Next.js app conventions — Prisma and database** above.

Key models to understand/adapt:

- `Store` (maps to shop/storefront for riben.life)
- `Product` (base product catalog)
- `Order` (customer orders with customization data)
- `User` (customer and admin accounts)

## Common Development Tasks

### Adding a New Feature

1. **Define types** in `src/types/` or add to existing type files
2. **Create Zod schema** in `*.validation.ts`
3. **Create server action** in `src/actions/[domain]/`
4. **Add route** in `src/app/` directory
5. **Build components** in `src/components/` (use `'use client'` only when needed)
6. **Test** and run linter (`bun run lint`)

### Working with the Product Customizer

The designer interface should:

- Display the product with preview layers
- Allow users to apply the riben.life pattern
- Adjust pattern placement and scale
- Show real-time preview
- Save customization to cart/order

### Authentication Flow

User authentication uses Better Auth with support for:

- Email/password with verification
- Magic links (passwordless)
- OAuth (Google, LINE)
- Passkeys (WebAuthn)

Protected routes use middleware or server action client restrictions.

## Performance Notes

- **Next.js Turbo**: Development builds use Turbo for faster compilation
- **Build Optimization**: Multiple build variants available for memory-constrained environments
- **Image Optimization**: Tailwind UI and Cloudinary image serving configured
- **Code Splitting**: Automatic via Next.js App Router
- **Server Rendering**: Default to server components to reduce JavaScript sent to client

## Linting and Code Quality

```bash
cd web

# Check and fix code style
bun run bio_lint

# Format code
bun run format

# Full lint with ESLint
bun run lint
```

The project uses Biome for fast linting and formatting. Configuration is in `.biomejs.json` or similar.

## Debugging

```bash
cd web

# Debug with Node inspector
bun run debugdev
# Opens inspector at chrome://inspect

# View console logs during cleanup
bun run cleanup:console
```

## Environment Variables

Create a `.env.local` file based on the project requirements. Key variables include:

- Database connection string (`DATABASE_URL`)
- Authentication secrets (Better Auth)
- Stripe keys (`STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`)
- LINE Pay credentials
- API endpoints
- Third-party service keys (Google Analytics, reCAPTCHA, etc.)

See documentation in `/doc` directory (from riben.life project) for complete list.

## Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better Auth Docs](https://www.better-auth.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Bun Runtime](https://bun.sh/docs)
- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)

## Related Documentation

The riben.life project includes comprehensive documentation in the `/doc` directory covering:

- Deployment strategies
- Payment system architecture
- Security guidelines
- Database optimization
- RBAC patterns

Many of these apply directly to riben.life, though focus should shift from restaurant operations to e-commerce customization.

## Agent skills (Cursor + Claude Code)

Committed project skills live under **`.cursor/skills/<name>/SKILL.md`** (e.g. **payment-plugin**, **shadcn**, **frontend-design**, **three-js**, **migrate-prisma-v7**, **r3f-fundamentals**). Repo-root **`.claude/skills/<name>`** symlinks into **`.cursor/skills/<name>`** so Claude Code reads the same tree. Read **`SKILL.md`** before changing the area it covers.

Optional machine-wide skills: **`~/.agents/skills/`** — from **`web/`**, run `bun run link:agents-skills` (creates gitignored **`web/.agents/skills-global`**). See **`.cursor/rules/agents-user-skills.mdc`** and **`web/.agents/README.md`**.

- **`payment-plugin`** — dual-mode payment plugins (shop `PaymentMethodPlugin` vs platform `SubscriptionBillingPlugin`), Stripe registries, PI route, subscribe confirm, webhooks. **Money:** Stripe `unit_amount` / PI amounts — **USD & TWD** = 1/100 major; **JPY, KRW, …** = Stripe zero-decimal whole majors (`STRIPE_ZERO_DECIMAL_CURRENCIES`, excludes `twd`). App internal minor (major×100) — see `web/doc/STRIPE_STORE_SUBSCRIPTION_METADATA.md` and `web/src/lib/payment/stripe/stripe-money.ts`; subscribe UI uses `formatInternalMinorForDisplay` on serialized internal minor; `web/bin/install.ts` env values are Stripe units (yearly defaults use `internalMinorToStripeUnit`).

## Learned User Preferences

- Account menu shows **Store admin** for `owner`, `admin`, `storeAdmin`, and `staff` (`web/src/components/auth/dropdown-user.tsx`).

## Learned Workspace Facts

- **Turbopack + `/api/chat` Rhubarb:** Lip-sync code lives in `web/src/lib/chat/rhubarb-lipsync.ts` (`node:fs`, `spawn`); `web/src/app/api/chat/route.ts` dynamically imports it. `web/next.config.ts` uses `turbopack.ignoreIssue` with path `next.config.(t|j)s`, title matching `unexpected file in NFT list`, and description matching `rhubarb-lipsync` or `api/chat/route`.
- **Client components:** Avoid `@prisma/client` imports in `"use client"` modules (Turbopack client build errors). Use `Role` from `@/types/enum` where Prisma enum strings match (e.g. `edit-sysadmin-user.tsx`).
- **Riben port tracking:** `web/doc/RIBEN_SYNC.md` records manual minimum port (`storeAdmin` / `sysAdmin`, products, orders, settings) and riben.life/riben `HEAD` when updated; align access with `storeActionClient` and store-access helpers.
- **i18n:** Store admin nav and storefront settings use snake_case keys (`store_admin_*`, `storefront_*`, `settings_saved`, `updated_at`, …) in `web/src/app/i18n/locales/en` and `tw` `translation.json`.

---

**Claude Code** loads root [`CLAUDE.md`](CLAUDE.md) (`@AGENTS.md`). If the project is opened with **`web/`** as the workspace root, [`web/CLAUDE.md`](web/CLAUDE.md) points at the same instructions (`@../AGENTS.md`).

---
name: migrate-prisma-v7
description: >-
  Guide Prisma ORM v6 → v7 upgrades (schema generator, prisma.config.ts, DB
  adapters, client construction, seed/CLI). Use when the user asks to migrate
  to Prisma 7, upgrade Prisma major version, or fix post-upgrade Prisma issues.
---

# Migrate to Prisma ORM v7

**Official prompt (source of truth):** [Migrate to Prisma v7 | Prisma Documentation](https://www.prisma.io/docs/ai/prompts/prisma-7)

**This repository:** Follow the detailed checklist in **`.cursor/rules/prisma_v7.mdc`** (same content lineage as the official prompt; kept in-repo for `@` references).

## How to use this skill

1. Read **`prisma_v7.mdc`** end-to-end before editing.
2. Work in small, reviewable steps; do not remove user logic or Accelerate without explicit instruction.
3. **MongoDB** in `schema.prisma` → stop and recommend staying on Prisma v6 until v7 MongoDB support is suitable.
4. **Bun:** skip `dotenv` where the rule says (Bun loads `.env`); still align with `prisma.config.ts` / CLI expectations for this project’s package manager (`bun` per project rules).
5. After schema/generator changes, run **`prisma generate`** (or the repo’s equivalent script).
6. If the schema uses **`@map` on enum values**, read the **Mapped enum** section in `prisma_v7.mdc` and warn about v7 behavior / known issues.

## Quick reference (do not skip the rule file)

- Dependencies: `prisma@7`, `@prisma/client@7`, one DB adapter (e.g. Postgres → adapter matching project DB).
- `schema.prisma`: `generator` → `provider = "prisma-client"`, `output` to generated path; **remove `url`** from `datasource` (URL moves to `prisma.config.ts`).
- Add **`prisma.config.ts`** with `datasource.url` / migrations / seed paths.
- Runtime: `PrismaClient` constructed with the driver adapter; keep Accelerate only per rule (caching vs direct TCP guidance).
- Replace `prisma.$use` usage with **extensions** where applicable.

## Deliverables for the user

Summarize changes in a short PR-style note: deps, schema, `prisma.config.ts`, client adapter wiring, seed/scripts, CI/Node version notes, CLI flag updates, enum `@map` warnings if relevant.

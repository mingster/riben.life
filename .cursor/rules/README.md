# Cursor rules index (riben.life)

Rules in `.cursor/rules/*.mdc`. **Always-applied** rules load every chat; **glob** rules load when editing matching files.

## Always applied (keep short)

| File | Topic |
|------|--------|
| `github.mdc` | Commit/push/pull only when asked |
| `memory.mdc` | Update `learned-memories.mdc` |
| `cursor-rules.mdc` | How to add rules |
| `agents-user-skills.mdc` | `~/.agents/skills/<name>/SKILL.md` |
| `project-structure.mdc` | Turborepo, `web/`, bun |
| `package-manager.mdc` | bun only |
| `shared-packages.mdc` | No mingster.backbone — local `@/components` |
| `zod-v4.mdc` | Zod v4 validation |

## Loaded by file pattern

| File | Topic |
|------|--------|
| `actions-vs-lib.mdc` | `src/actions/` vs `src/lib/` |
| `form-handling.mdc` | RHF + Zod forms |
| `CRUD-Guide.mdc` | Admin CRUD + client state |
| `crud-naming.mdc` | (see CRUD-Guide) |
| `server-actions.mdc` | next-safe-action |
| `import-export-pattern.mdc` | JSON import/export APIs |
| `logging.mdc` | `logger` |
| `mobile-optimization.mdc` | Touch targets |
| `tailwind.mdc` | Tailwind v4 |
| `i18n-naming.mdc` | Translation keys |
| `documentation.mdc` | `/doc/` one topic per file |
| `file-organization.mdc` | `bin/`, `doc/`, `web/src` layout |
| `web-prisma.mdc` | Prisma |
| `build-execution.mdc` | When to run builds |
| `r3f-fundamentals.mdc` | React Three Fiber |
| `data-fetching.mdc`, `client-component-swr-pattern.mdc` | SWR |
| `prisma_v7.mdc`, `nextjs.mdc` | Reference |

## Memory

- `learned-memories.mdc` — project facts (consult when relevant).

## Adding a rule

1. `kebab-case.mdc` under `.cursor/rules/` with YAML frontmatter.
2. Prefer **glob + `alwaysApply: false`** for domain rules.
3. Run scripts from **`web/`** (see `AGENTS.md`).

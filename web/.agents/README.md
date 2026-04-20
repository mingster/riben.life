# Agent skills

## Committed in this repo

Project skills live under **`.cursor/skills/<name>/SKILL.md`** at the **repository root** (not only under `web/`). Examples: **shadcn**, **frontend-design**, **payment-plugin**, **three-js**, **migrate-prisma-v7**, **r3f-fundamentals**.

**`.claude/skills/<name>`** (repo root) are **symlinks** into **`.cursor/skills/<name>`** so Claude Code and Cursor share one source tree.

## Optional — your machine (`~/.agents/skills`)

Extra skills (TDD, PRDs, architecture reviews, etc.) can live in **`~/.agents/skills/<name>/`**. To expose them under this workspace (for tools that only search the repo), from **`web/`** run:

```bash
bun run link:agents-skills
```

That creates a **gitignored** symlink **`web/.agents/skills-global`** → **`~/.agents/skills`**. Then you can read e.g. **`web/.agents/skills-global/tdd/SKILL.md`** with the same layout as on disk in your home folder.

**Windows:** symlinks may require Developer Mode or `git config core.symlinks true`; if linking fails, open the repo in WSL or copy skills into **`web/.agents/skills-global`** manually (keep that path gitignored if it points outside the repo).

## `web/AGENTS.md`

**`web/AGENTS.md`** is a **symlink** to **[`../AGENTS.md`](../AGENTS.md)** so agents that only index the `web/` folder still load the single canonical instructions. Use the same Git symlink settings as above if the link is missing on Windows.

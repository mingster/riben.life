# Agent skills

All skills (including **shadcn** and **frontend-design**) live in **`~/.agents/skills/`** on your machine.

To expose them under this repo for tools that only index the workspace, run:

```bash
bun run link:agents-skills
```

That creates a gitignored symlink **`skills-global`** → `~/.agents/skills`.

Claude Code picks up **shadcn** and **frontend-design** via symlinks under **`web/.claude/skills/`** (committed), which point through `skills-global`.

## New clone / missing skills

If `~/.agents/skills` does not yet include **shadcn** or **frontend-design**, copy them from another machine or restore from Git history before they were moved (e.g. `git show <commit>:web/.agents/skills/shadcn` while that path still exists).

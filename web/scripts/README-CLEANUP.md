# Console.log Cleanup Script

Automated script to replace all `console.log/error/warn` statements with proper structured logging using the `logger` utility.

## Features

✅ **Automatic replacement** of console statements with logger
✅ **Smart import injection** - adds logger import if missing  
✅ **Preserves NODE_ENV guards** - keeps development-only logs
✅ **Structured logging** - generates proper metadata and tags
✅ **Context-aware** - different handling for API routes vs components
✅ **Dry-run mode** - preview changes before applying
✅ **Detailed reporting** - shows exactly what was changed

## Usage

### 1. Dry Run (Preview Changes)

**Recommended first step** - see what would be changed without modifying files:

```bash
cd web
bun run cleanup:console --dry-run
```

This will:

- Show all files that would be modified
- Count total replacements
- Identify guarded statements that will be kept
- Report any errors

### 2. Run on Specific Directory

Test on a single directory first:

```bash
# API routes only
bun run cleanup:console --path=src/app/api --dry-run

# Actions only  
bun run cleanup:console --path=src/actions --dry-run

# Store admin components
bun run cleanup:console --path=src/app/storeAdmin --dry-run
```

### 3. Apply Changes

Once you've reviewed the dry-run output:

```bash
# Apply to specific directory
bun run cleanup:console --path=src/app/api

# Apply to entire src directory
bun run cleanup:console
```

### 4. Review Changes

After running, review the git diff:

```bash
git diff src/
```

If you're happy with the changes:

```bash
git add -A
git commit -m "refactor: replace console.log with structured logger"
```

If you want to revert:

```bash
git checkout src/
```

## What Gets Replaced

### Before

```typescript
console.log("[API_ROUTE]", error);
console.error("Error:", error);
console.warn("Warning", data);
console.info("Info", message);
```

### After

```typescript
import logger from "@/lib/logger";

logger.error("api route", {
  metadata: {
    error: error instanceof Error ? error.message : String(error),
  },
  tags: ["api", "error"],
});
```

## What Gets Kept

NODE_ENV guarded console statements are preserved:

```typescript
// ✅ KEPT - Development only
if (process.env.NODE_ENV === "development") {
  console.log("Debug info", data);
}

// ✅ KEPT - Not production
if (process.env.NODE_ENV !== "production") {
  console.log("Dev log", info);
}
```

## Files Skipped

The script automatically skips:

- `node_modules/`
- `.next/`
- `.git/`
- `dist/`, `build/`, `coverage/`
- Test files (`*.test.*`, `*.spec.*`)

## Troubleshooting

### Script fails with "Cannot find module"

Make sure you're in the web directory:

```bash
cd web
bun run cleanup:console
```

### Too many changes at once

Run on smaller directories first:

```bash
bun run cleanup:console --path=src/app/api
```

### Want to review each file

Use dry-run mode and review the output:

```bash
bun run cleanup:console --dry-run | tee cleanup-report.txt
```

### Need to revert changes

```bash
git checkout src/
```

## Advanced Usage

### Direct Script Execution

```bash
bun run scripts/cleanup-console-logs.ts --dry-run
bun run scripts/cleanup-console-logs.ts --path=src/app/api
```

### Custom Modifications

Edit `scripts/cleanup-console-logs.ts` to customize:

- Skip patterns
- Keep patterns  
- Logger message generation
- Metadata extraction

## Safety Features

1. **Dry-run by default** - Always test first
2. **Preserves formatting** - Maintains indentation and structure
3. **Smart detection** - Skips guarded and commented console statements
4. **Git-friendly** - Easy to review and revert changes
5. **Error reporting** - Clear feedback on any issues

## Expected Results

Based on codebase analysis:

- **Files to modify:** ~149
- **Console statements to replace:** ~310
- **NODE_ENV guarded (kept):** ~3
- **Estimated runtime:** ~5 seconds

## Next Steps After Running

1. **Review changes:**

   ```bash
   git diff
   ```

2. **Test the application:**

   ```bash
   bun run dev
   ```

3. **Check logs work:**
   - Trigger some operations
   - Verify structured logs appear in console
   - Confirm no errors

4. **Commit:**

   ```bash
   git add -A
   git commit -m "refactor: replace console.log with structured logger"
   ```

## Support

If you encounter issues:

1. Run with `--dry-run` first
2. Check the error output
3. Review this README
4. Test on a small directory first (`--path=src/app/api`)

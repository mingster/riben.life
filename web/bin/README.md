# Utility Scripts

This directory contains utility scripts for database management and system setup.

## Installation Scripts

### `install.ts` - Database Installation

Initializes the database with default data (countries, currencies, locales).

**Usage:**

```bash
# Check installation status
bun run install:check

# Run full installation (only populates missing data)
bun run install:data

# Wipeout and reinstall (WARNING: Deletes all data)
bun run install:wipeout
```

**What it does:**

1. ✅ Populates countries (ISO 3166)
2. ✅ Populates currencies (ISO 4217)
3. ✅ Populates locales
4. ✅ Checks platform settings and Stripe configuration

**Data Sources:**

- `public/install/country_iso.json` - Country data
- `public/install/currency_iso.json` - Currency data
- `public/install/locales.json` - Locale data

## Database Scripts

### `close-db-connections.ts` - Connection Management

Closes stale database connections for the `prisma_migration` role.

**Usage:**

```bash
# Close all active connections
bun run db:close-connections
```

**When to use:**

- Getting "too many connections" errors
- After development session with many hot reloads
- Before running migrations
- When connection pool is exhausted

## Script Development

All scripts should:

1. Include a shebang: `#!/usr/bin/env bun`
2. Have comprehensive documentation in comments
3. Handle errors gracefully
4. Use proper logging with emoji indicators
5. Disconnect from database in `finally` block
6. Support command-line arguments where appropriate

### Example Script Structure

```typescript
#!/usr/bin/env bun
/**
 * Script Title
 * 
 * Description of what the script does
 * 
 * Usage:
 *   bun run bin/script-name.ts
 *   bun run bin/script-name.ts --flag
 */

import { sqlClient } from "@/lib/prismadb";

async function main() {
  try {
    console.log("🚀 Starting...");
    
    // Script logic here
    
    console.log("✅ Done!");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await sqlClient.$disconnect();
  }
}

main();
```

## Available npm/bun Scripts

See `package.json` for all available scripts:

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run start            # Start production server

# Database
bun run sql:generate     # Generate Prisma client
bun run sql:dbpush       # Push schema to database
bun run install:data     # Populate default data
bun run install:check    # Check installation
bun run db:close-connections  # Close DB connections

# Code Quality
bun run lint             # Run linter
bun run format           # Format code
```

## Troubleshooting

### "Too many connections" error

```bash
bun run db:close-connections
# Then restart your dev server
```

### Installation fails

```bash
# Check current status
bun run install:check

# Try wipeout and reinstall
bun run install:wipeout
```

### Script not executable

```bash
chmod +x bin/script-name.ts
```

## Contributing

When adding new scripts:

1. Place them in `/web/bin/`
2. Add appropriate npm scripts in `package.json`
3. Update this README
4. Include comprehensive documentation in script comments
5. Test thoroughly before committing


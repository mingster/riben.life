# Installation Scripts

This directory contains utility scripts for the riben.life platform.

## install.ts

Platform installation script that initializes the database with default data.

### What it does:

1. **Creates Stripe Products**: Sets up subscription products and pricing in Stripe
2. **Populates Country Data**: Loads country information from JSON
3. **Populates Currency Data**: Loads currency information from JSON
4. **Creates Locales**: Sets up supported locales (languages)
5. **Creates Payment Methods**: Initializes available payment methods (Stripe, LINE Pay, etc.)
6. **Creates Shipping Methods**: Sets up shipping options

### Usage:

```bash
# From the web directory
cd web
bun run install:platform

# Or directly from project root
cd bin
bun run install.ts
```

### Prerequisites:

- Database must be set up and migrations applied (`bunx prisma db push`)
- Environment variables must be configured (especially Stripe API keys)
- Prisma client must be generated (`bunx prisma generate`)

### When to run:

- After initial database setup
- When setting up a new environment (development, staging, production)
- If platform settings or default data needs to be recreated

### Notes:

- The script is idempotent - it checks if data already exists before creating
- If data already exists, it will skip creation and show counts
- Stripe products are only created if they don't exist or are invalid
- The script will exit with code 0 on success, 1 on failure

## Other Scripts

- `pg_backup*.sh` - PostgreSQL backup scripts
- `sync_*.sh` - Production sync scripts
- `upgrade_pkg.sh` - Package upgrade utilities


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

## Deployment Scripts

### deploy-ubuntu.sh

Deployment script for Ubuntu platform. Run this script directly on the Ubuntu server.

**Usage:**
```bash
# Deploy production (default branch: main)
sudo ./bin/deploy-ubuntu.sh production

# Deploy staging with specific branch
sudo ./bin/deploy-ubuntu.sh staging develop

# Deploy with custom branch
sudo ./bin/deploy-ubuntu.sh production feature-branch
```

**What it does:**
1. Creates backup of current deployment
2. Updates code from git (pulls latest changes)
3. Installs dependencies with bun
4. Generates Prisma client
5. Builds the Next.js application
6. Restarts PM2 process
7. Performs health check
8. Rolls back on failure

**Prerequisites:**
- Must be run as root or with sudo
- Requires: bun, pm2, git
- App must be cloned to `/var/www/riben.life`

### deploy-ubuntu-remote.sh

Remote deployment script. Run this from your local machine to deploy to a remote Ubuntu server.

**Usage:**
```bash
# Deploy to production (default: root@mx2.mingster.com)
./bin/deploy-ubuntu-remote.sh production

# Deploy to staging with specific branch
./bin/deploy-ubuntu-remote.sh staging develop

# Deploy to custom server
./bin/deploy-ubuntu-remote.sh production main user@example.com
```

**What it does:**
1. Checks SSH connection to remote server
2. Uploads deployment script to server
3. Executes deployment on remote server
4. Shows deployment progress and logs

**Prerequisites:**
- SSH access to remote server (key-based authentication)
- Remote server must have: bun, pm2, git installed
- App must be cloned to `/var/www/riben.life` on remote server

## Other Scripts

- `pg_backup*.sh` - PostgreSQL backup scripts
- `sync_*.sh` - Production sync scripts
- `upgrade_pkg.sh` - Package upgrade utilities


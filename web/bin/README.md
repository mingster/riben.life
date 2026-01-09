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

### deploy-pm2-minimal.sh

Minimal deployment script that deploys only necessary files to a PM2 host. This script is optimized for faster deployments by transferring only build output, configuration files, and dependencies metadata.

**Usage:**
```bash
# Full deployment with build (default values)
./bin/deploy-pm2-minimal.sh

# Custom host and path
./bin/deploy-pm2-minimal.sh mx2.mingster.com root /var/www/riben.life/web riben.life 3001

# Deploy without building (use existing build)
./bin/deploy-pm2-minimal.sh mx2.mingster.com root /var/www/riben.life/web riben.life 3001 .next true

# Or use environment variable
SKIP_BUILD=true ./bin/deploy-pm2-minimal.sh
```

**Arguments:**
- `host` - Remote hostname or IP (default: mx2.mingster.com)
- `user` - SSH user (default: root)
- `remote_path` - Remote deployment path (default: /var/www/riben.life/web)
- `pm2_name` - PM2 process name (default: riben.life)
- `port` - Application port (default: 3001)
- `build_dir` - Build directory (default: .next)
- `skip_build` - Skip build step (default: false, set to 'true' to skip)

**What it does:**
1. Checks prerequisites (rsync, SSH, bun)
2. Builds the application (unless SKIP_BUILD=true)
3. Creates deployment package with only necessary files:
   - `.next/standalone/` - Next.js standalone build
   - `.next/static/` - Static assets
   - `public/` - Public assets
   - `package.json`, `bun.lock` - Dependencies metadata
   - `prisma/` - Prisma schema
   - Configuration files (next.config.ts, tsconfig.json, etc.)
4. Syncs files to remote server using rsync
5. Installs production dependencies on server
6. Generates Prisma client on server
7. Restarts PM2 process
8. Performs health check

**What it does NOT deploy:**
- Source code (`src/`)
- Development dependencies
- `.env` files (handle separately for security)
- Git repository
- Build artifacts not needed for runtime
- Documentation files

**Prerequisites:**
- `rsync` installed locally
- SSH access to remote server (key-based authentication recommended)
- `bun` installed locally (for build, unless SKIP_BUILD=true)
- `bun` and `pm2` installed on remote server
- Next.js configured with `output: "standalone"` in `next.config.ts`

**Benefits:**
- Faster deployments (only necessary files)
- Smaller transfer size
- Cleaner server environment
- Reduced security surface (no source code on server)

**Notes:**
- `.env` files must be managed separately on the server
- First deployment may take longer (full build + dependency installation)
- Subsequent deployments are faster (can skip build if unchanged)

## Other Scripts

- `pg_backup*.sh` - PostgreSQL backup scripts
- `sync_*.sh` - Production sync scripts
- `upgrade_pkg.sh` - Package upgrade utilities


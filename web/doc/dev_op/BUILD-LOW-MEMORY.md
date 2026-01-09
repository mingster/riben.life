# Building on Low Memory Machines (2GB RAM)

This document provides guidance for building the riben.life project on machines with limited RAM (2GB or less).

## Overview

The project has **1048+ TypeScript/TSX files** and many dependencies, which makes it memory-intensive to build. While it's possible to build on a 2GB machine, it requires careful optimization and may be slow or fail if the system is under memory pressure.

## Memory Requirements

### Recommended
- **4GB+ RAM**: Standard builds work well
- **2GB RAM**: Possible with optimizations, but may be slow or fail

### Build Memory Usage
- **Standard build**: ~2-3GB peak memory
- **Optimized build**: ~1.5-2GB peak memory
- **Low-memory build**: ~1-1.5GB peak memory

## Build Options

### 1. Low-Memory Build (Recommended for 2GB machines)

```bash
bun run build:low-memory
```

This script:
- Limits Node.js heap to 1.5GB
- Skips linting
- Disables source maps
- Clears caches before building
- Builds in stages (Prisma first, then Next.js)

### 2. Fast Build (2GB limit)

```bash
bun run build:fast-optimized
```

Uses 2GB memory limit but may still struggle on tight systems.

### 3. Standard Build (Not recommended for 2GB)

```bash
bun run build
```

Requires 2-3GB RAM and may fail on 2GB machines.

## Pre-Build Checklist

Before building on a 2GB machine:

1. **Free up memory**:
   ```bash
   # Close unnecessary applications
   # Check memory usage
   free -h  # Linux
   vm_stat  # macOS
   ```

2. **Enable swap space** (Linux):
   ```bash
   # Check if swap exists
   swapon --show
   
   # If no swap, create one (2GB recommended)
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   
   # Make it permanent
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

3. **Clear caches**:
   ```bash
   # Clear Next.js cache
   rm -rf .next/cache
   
   # Clear node_modules cache
   rm -rf node_modules/.cache
   ```

4. **Close other applications**:
   - Web browsers
   - IDEs (if not needed)
   - Other Node.js processes
   - Database servers (if not needed)

## Build Process

### Step-by-Step Low-Memory Build

```bash
# 1. Install dependencies (if not already done)
bun install --frozen-lockfile

# 2. Generate Prisma client separately (uses less memory)
bunx prisma generate

# 3. Build with low-memory script
bun run build:low-memory
```

### If Build Fails

1. **Check available memory**:
   ```bash
   free -h  # Linux
   ```

2. **Kill other processes**:
   ```bash
   # Find memory-intensive processes
   ps aux --sort=-%mem | head -10
   
   # Kill unnecessary processes
   kill <PID>
   ```

3. **Increase swap** (if possible):
   ```bash
   # Add more swap space
   sudo fallocate -l 4G /swapfile2
   sudo chmod 600 /swapfile2
   sudo mkswap /swapfile2
   sudo swapon /swapfile2
   ```

4. **Build in stages manually**:
   ```bash
   # Stage 1: Prisma only
   NODE_OPTIONS="--max-old-space-size=512" bunx prisma generate
   
   # Stage 2: Next.js build
   NODE_OPTIONS="--max-old-space-size=1536" NEXT_TELEMETRY_DISABLED=1 bun run next build --no-lint
   ```

## Alternative: Build on Different Machine

If building on a 2GB machine is too difficult, consider:

### Option 1: Build Locally, Deploy Remotely

1. Build on a machine with more RAM (4GB+)
2. Use the minimal deployment script to deploy only necessary files:
   ```bash
   ./bin/deploy-pm2-minimal.sh
   ```

### Option 2: Use CI/CD

Build on a CI/CD service (GitHub Actions, GitLab CI, etc.) which typically provides 4GB+ RAM:

```yaml
# Example GitHub Actions workflow
- name: Build
  run: bun run build
  env:
    NODE_OPTIONS: --max-old-space-size=4096
```

### Option 3: Use Docker with Memory Limits

Build in a Docker container with memory limits:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN NODE_OPTIONS="--max-old-space-size=1536" bun run build:low-memory
```

## Monitoring Build Memory

During build, monitor memory usage:

```bash
# Linux: Watch memory in real-time
watch -n 1 free -h

# Or use htop
htop

# Check Node.js process memory
ps aux | grep node
```

## Troubleshooting

### "JavaScript heap out of memory"

**Solution**: The build exceeded the memory limit.

1. Use the low-memory build script
2. Increase swap space
3. Close other applications
4. Build on a machine with more RAM

### Build is very slow

**Expected**: Low-memory builds are slower due to:
- Smaller memory limits
- More frequent garbage collection
- Swap usage (if enabled)

**Solution**: Be patient, or build on a machine with more RAM.

### Prisma generation fails

**Solution**: Generate Prisma separately with lower memory:

```bash
NODE_OPTIONS="--max-old-space-size=512" bunx prisma generate
```

### Next.js build fails

**Solution**: Try building with even lower memory limit:

```bash
NODE_OPTIONS="--max-old-space-size=1024" NEXT_TELEMETRY_DISABLED=1 bun run next build --no-lint
```

## Performance Expectations

### 2GB RAM Machine
- **Build time**: 10-20 minutes (or more)
- **Success rate**: 60-80% (depends on system load)
- **Memory usage**: 1.5-2GB peak

### 4GB+ RAM Machine
- **Build time**: 3-5 minutes
- **Success rate**: 95%+
- **Memory usage**: 2-3GB peak

## Recommendations

1. **For production builds**: Use a machine with 4GB+ RAM
2. **For development**: 2GB is usually sufficient (dev server uses less memory)
3. **For CI/CD**: Use services with 4GB+ RAM
4. **For deployment**: Use the minimal deployment script to avoid building on the server

## Related Scripts

- `bun run build:low-memory` - Low-memory optimized build
- `bun run build:fast-optimized` - Fast build with 2GB limit
- `bun run build:optimized` - Standard optimized build (4GB limit)
- `./bin/deploy-pm2-minimal.sh` - Minimal deployment (no build on server)

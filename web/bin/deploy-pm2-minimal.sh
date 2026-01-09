#!/bin/bash

# Minimum deployment script for PM2 host
# Deploys only necessary files (build output, configs, dependencies)
# Usage: ./bin/deploy-pm2-minimal.sh [host] [user] [remote_path] [pm2_name] [port]
# Example: ./bin/deploy-pm2-minimal.sh riben.life root /var/www/riben.life/web riben.life 3001

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HOST="${1:-riben.life}"
USER="${2:-root}"
REMOTE_PATH="${3:-/var/www/riben.life/web}"
PM2_NAME="${4:-riben.life}"
PORT="${5:-3001}"
BUILD_DIR="${6:-.next}"
SKIP_BUILD="${7:-false}"

# Local paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WEB_DIR="${PROJECT_ROOT}"

# Logging functions (all output to stderr to avoid interfering with return values)
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" >&2
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if rsync is available
    if ! command -v rsync &> /dev/null; then
        error "rsync is not installed. Please install it first."
        exit 1
    fi
    
    # Check if SSH is available
    if ! command -v ssh &> /dev/null; then
        error "SSH is not installed. Please install it first."
        exit 1
    fi
    
    # Check if bun is available (for build)
    if [ "$SKIP_BUILD" != "true" ] && ! command -v bun &> /dev/null; then
        error "bun is not installed. Please install it or use SKIP_BUILD=true"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Build the application
build_app() {
    if [ "$SKIP_BUILD" = "true" ]; then
        warning "Skipping build (SKIP_BUILD=true)"
        return 0
    fi
    
    log "Building application..."
    
    cd "${WEB_DIR}"
    
    # Check if build already exists
    if [ -d "${BUILD_DIR}" ]; then
        warning "Build directory exists. Consider using SKIP_BUILD=true to skip rebuild."
        read -p "Rebuild anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            warning "Skipping build"
            return 0
        fi
    fi
    
    # Clean build directory to remove any dev artifacts (including Turbopack)
    if [ -d "${BUILD_DIR}" ]; then
        log "Cleaning build directory to remove dev artifacts..."
        rm -rf "${BUILD_DIR}"
        log "✓ Build directory cleaned"
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing dependencies..."
        bun install --frozen-lockfile
    fi
    
    # Generate Prisma client
    log "Generating Prisma client..."
    bunx prisma generate
    
    # Build the application with production environment
    log "Running Next.js production build..."
    NODE_ENV=production bun run build
    
    # Verify build exists
    if [ ! -d "${BUILD_DIR}" ]; then
        error "Build directory not found. Build may have failed."
        exit 1
    fi
    
    log "Build completed successfully"
}

# Create deployment package
create_deployment_package() {
    log "Preparing deployment package..."
    
    cd "${WEB_DIR}"
    
    # Create temporary directory for deployment
    TEMP_DIR=$(mktemp -d)
    DEPLOY_DIR="${TEMP_DIR}/deploy"
    mkdir -p "${DEPLOY_DIR}"
    
    info "Temporary deployment directory: ${TEMP_DIR}"
    
    # Copy necessary files and directories
    log "Copying build output..."
    
    # Copy .next build directory (excluding dev, cache, and Turbopack artifacts)
    if [ -d "${BUILD_DIR}" ]; then
        mkdir -p "${DEPLOY_DIR}/${BUILD_DIR}"
        # Copy .next contents, excluding dev, cache, and Turbopack chunks
        rsync -a \
            --exclude='dev' \
            --exclude='cache' \
            --exclude='**/chunks/[turbopack]*' \
            --exclude='**/*turbopack*' \
            "${BUILD_DIR}/" "${DEPLOY_DIR}/${BUILD_DIR}/"
        log "✓ Copied .next build directory (excluding dev, cache, and Turbopack artifacts)"
    else
        error "Build directory not found. Run build first."
        exit 1
    fi
    
    # Copy public directory
    if [ -d "public" ]; then
        cp -r "public" "${DEPLOY_DIR}/"
        log "✓ Copied public/"
    fi
    
    # Copy source code (required for Next.js production server)
    if [ -d "src" ]; then
        cp -r "src" "${DEPLOY_DIR}/"
        log "✓ Copied src/ directory"
    else
        error "Source directory (src/) not found. This is required for Next.js production."
        exit 1
    fi
    
    # Copy configuration files
    log "Copying configuration files..."
    cp "package.json" "${DEPLOY_DIR}/"
    cp "bun.lock" "${DEPLOY_DIR}/" 2>/dev/null || warning "bun.lock not found"
    cp "next.config.ts" "${DEPLOY_DIR}/" 2>/dev/null || cp "next.config.js" "${DEPLOY_DIR}/" 2>/dev/null || warning "next.config not found"
    cp "tsconfig.json" "${DEPLOY_DIR}/" 2>/dev/null || warning "tsconfig.json not found"
    
    # Copy Prisma schema (needed for client generation)
    if [ -d "prisma" ]; then
        cp -r "prisma" "${DEPLOY_DIR}/"
        log "✓ Copied prisma/"
    fi
    
    # Copy any other necessary config files
    [ -f "postcss.config.mjs" ] && cp "postcss.config.mjs" "${DEPLOY_DIR}/" && log "✓ Copied postcss.config.mjs"
    [ -f "components.json" ] && cp "components.json" "${DEPLOY_DIR}/" && log "✓ Copied components.json"
    [ -f "vercel.json" ] && cp "vercel.json" "${DEPLOY_DIR}/" && log "✓ Copied vercel.json"
    
    # Create .env.example or note about environment variables
    cat > "${DEPLOY_DIR}/DEPLOYMENT_NOTES.txt" << EOF
Deployment Package Created: $(date)
Build Directory: ${BUILD_DIR}
PM2 Name: ${PM2_NAME}
Port: ${PORT}

IMPORTANT:
- Make sure .env file exists on the server with correct environment variables
- Run 'bun install --production' on the server to install dependencies
- Run 'bunx prisma generate' on the server to generate Prisma client
- Restart PM2 process after deployment

Files included:
- .next/ (Next.js build output)
- src/ (Source code - required for server components and API routes)
- public/ (Public assets)
- package.json, bun.lock (Dependencies)
- prisma/ (Prisma schema)
- Configuration files
EOF
    
    log "Deployment package created at: ${DEPLOY_DIR}"
    echo "${DEPLOY_DIR}"
}

# Deploy to remote server
deploy_to_server() {
    local deploy_dir="$1"
    
    log "Deploying to ${USER}@${HOST}:${REMOTE_PATH}..."
    
    # Test SSH connection
    log "Testing SSH connection..."
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${USER}@${HOST}" "echo 'SSH connection successful'" 2>/dev/null; then
        error "Cannot connect to ${USER}@${HOST}"
        error "Make sure SSH keys are set up or use: ssh-copy-id ${USER}@${HOST}"
        exit 1
    fi
    
    # Create remote directory if it doesn't exist
    log "Creating remote directory..."
    ssh "${USER}@${HOST}" "mkdir -p ${REMOTE_PATH}"
    
    # Deploy files using rsync
    log "Syncing files to server..."
    rsync -avz --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.env*' \
        --exclude='*.log' \
        --exclude='.DS_Store' \
        --exclude='*.tsbuildinfo' \
        "${deploy_dir}/" "${USER}@${HOST}:${REMOTE_PATH}/"
    
    log "Files synced successfully"
}

# Install dependencies on remote server
install_remote_dependencies() {
    log "Installing dependencies on remote server..."
    
    ssh "${USER}@${HOST}" "cd ${REMOTE_PATH} && bun install --production --frozen-lockfile"
    
    log "Dependencies installed"
}

# Generate Prisma client on remote server
generate_remote_prisma() {
    log "Generating Prisma client on remote server..."
    
    ssh "${USER}@${HOST}" "cd ${REMOTE_PATH} && bunx prisma generate"
    
    log "Prisma client generated"
}

# Restart PM2 process
restart_pm2() {
    log "Restarting PM2 process: ${PM2_NAME}..."
    
    # Check if PM2 process exists
    if ssh "${USER}@${HOST}" "pm2 list | grep -q '${PM2_NAME}'"; then
        log "Restarting existing PM2 process: ${PM2_NAME}"
        ssh "${USER}@${HOST}" "cd ${REMOTE_PATH} && pm2 restart ${PM2_NAME}"
    else
        log "Starting new PM2 process: ${PM2_NAME}"
        ssh "${USER}@${HOST}" "cd ${REMOTE_PATH} && pm2 start bun --name ${PM2_NAME} -- start -- -p ${PORT}"
        ssh "${USER}@${HOST}" "pm2 save"
    fi
    
    # Wait a moment for the process to start
    sleep 2
    
    # Check PM2 status
    log "PM2 status:"
    ssh "${USER}@${HOST}" "pm2 status ${PM2_NAME}"
    
    log "PM2 process restarted"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if ssh "${USER}@${HOST}" "curl -f -s --max-time 5 http://localhost:${PORT} > /dev/null 2>&1 || nc -z localhost ${PORT} 2>/dev/null"; then
            log "Health check passed - server is responding on port ${PORT}"
            return 0
        fi
        
        warning "Health check attempt ${attempt}/${max_attempts} failed, retrying..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    warning "Health check failed after ${max_attempts} attempts"
    warning "Server may still be starting up. Check manually with: ssh ${USER}@${HOST} 'pm2 logs ${PM2_NAME}'"
    return 0
}

# Cleanup temporary files
cleanup() {
    if [ -n "${TEMP_DIR}" ] && [ -d "${TEMP_DIR}" ]; then
        log "Cleaning up temporary files..."
        rm -rf "${TEMP_DIR}"
        log "Cleanup completed"
    fi
}

# Main deployment function
main() {
    log "Starting minimal deployment to PM2 host..."
    log "Host: ${HOST}"
    log "User: ${USER}"
    log "Remote Path: ${REMOTE_PATH}"
    log "PM2 Name: ${PM2_NAME}"
    log "Port: ${PORT}"
    log "Skip Build: ${SKIP_BUILD}"
    
    # Set trap to cleanup on exit
    trap cleanup EXIT
    
    local deployment_failed=false
    local deploy_dir=""
    
    # Check prerequisites
    if ! check_prerequisites; then
        deployment_failed=true
    fi
    
    # Build application
    if [ "$deployment_failed" = false ] && ! build_app; then
        deployment_failed=true
    fi
    
    # Create deployment package
    if [ "$deployment_failed" = false ]; then
        deploy_dir=$(create_deployment_package)
        if [ -z "$deploy_dir" ]; then
            deployment_failed=true
        fi
    fi
    
    # Deploy to server
    if [ "$deployment_failed" = false ] && ! deploy_to_server "$deploy_dir"; then
        deployment_failed=true
    fi
    
    # Install dependencies
    if [ "$deployment_failed" = false ] && ! install_remote_dependencies; then
        deployment_failed=true
    fi
    
    # Generate Prisma client
    if [ "$deployment_failed" = false ] && ! generate_remote_prisma; then
        deployment_failed=true
    fi
    
    # Restart PM2
    if [ "$deployment_failed" = false ] && ! restart_pm2; then
        deployment_failed=true
    fi
    
    # Health check
    if [ "$deployment_failed" = false ]; then
        if ! health_check; then
            warning "Health check failed, but deployment completed"
        fi
    fi
    
    # Handle deployment failure
    if [ "$deployment_failed" = true ]; then
        error "Deployment failed!"
        exit 1
    fi
    
    log "Deployment completed successfully!"
    log "Application is running on ${HOST}:${PORT}"
    log "PM2 process: ${PM2_NAME}"
    
    # Show PM2 logs
    log "Recent PM2 logs:"
    ssh "${USER}@${HOST}" "pm2 logs ${PM2_NAME} --lines 10 --nostream"
}

# Show usage if help requested
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    cat << EOF
Minimal PM2 Deployment Script

Usage: $0 [host] [user] [remote_path] [pm2_name] [port] [build_dir] [skip_build]

Arguments:
  host         Remote hostname or IP (default: mx2.mingster.com)
  user         SSH user (default: root)
  remote_path  Remote deployment path (default: /var/www/riben.life/web)
  pm2_name     PM2 process name (default: riben.life)
  port         Application port (default: 3001)
  build_dir    Build directory (default: .next)
  skip_build   Skip build step (default: false, set to 'true' to skip)

Environment Variables:
  SKIP_BUILD   Set to 'true' to skip build step

Examples:
  # Full deployment with build
  $0 mx2.mingster.com root /var/www/riben.life/web riben.life 3001

  # Deploy without building (use existing build)
  $0 mx2.mingster.com root /var/www/riben.life/web riben.life 3001 .next true

  # Quick deployment
  SKIP_BUILD=true $0

Requirements:
  - rsync installed locally
  - SSH access to remote server
  - bun installed (for build, unless SKIP_BUILD=true)
  - PM2 installed on remote server

Notes:
  - Only necessary files are deployed (build output, configs, dependencies)
  - .env files are NOT deployed (handle separately for security)
  - node_modules are installed on the server
  - Prisma client is generated on the server
EOF
    exit 0
fi

# Run main function
main "$@"

#!/bin/sh

# Deployment script for Ubuntu platform
# Usage: ./bin/deploy-ubuntu.sh [production|staging] [branch]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
BRANCH="${2:-main}"
APP_NAME="riben.life"
APP_DIR="/var/www/riben.life"
WEB_DIR="${APP_DIR}/web"
PORT=3001
PM2_NAME="riben.life"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Create backup of current deployment
create_backup() {
    log "Creating backup..."
    
    local backup_dir="${APP_DIR}/backups/$(date +'%Y%m%d_%H%M%S')"
    mkdir -p "${backup_dir}"
    
    if [ -d "${WEB_DIR}/.next" ]; then
        cp -r "${WEB_DIR}/.next" "${backup_dir}/.next" || warning "Failed to backup .next directory"
    fi
    
    if [ -f "${WEB_DIR}/package.json" ]; then
        cp "${WEB_DIR}/package.json" "${backup_dir}/" || warning "Failed to backup package.json"
    fi
    
    # Backup .env file if it exists
    if [ -f "${WEB_DIR}/.env" ]; then
        cp "${WEB_DIR}/.env" "${backup_dir}/.env" || warning "Failed to backup .env file"
    fi
    
    log "Backup created at ${backup_dir}"
    echo "${backup_dir}" > "${APP_DIR}/.last_backup"
}

# Restore from backup
restore_backup() {
    local backup_dir=$(cat "${APP_DIR}/.last_backup" 2>/dev/null || echo "")
    
    if [ -z "$backup_dir" ] || [ ! -d "$backup_dir" ]; then
        error "No backup found to restore"
        return 1
    fi
    
    log "Restoring from backup: ${backup_dir}"
    
    if [ -d "${backup_dir}/.next" ]; then
        rm -rf "${WEB_DIR}/.next"
        cp -r "${backup_dir}/.next" "${WEB_DIR}/.next"
    fi
    
    log "Backup restored"
}

# Pull latest code from git
update_code() {
    log "Updating code from git (branch: ${BRANCH})..."
    
    cd "${APP_DIR}"
    
    # Preserve .env file if it exists
    if [ -f "${WEB_DIR}/.env" ]; then
        cp "${WEB_DIR}/.env" "${WEB_DIR}/.env.backup" || warning "Failed to backup .env before git pull"
    fi
    
    # Fetch latest changes
    git fetch origin
    
    # Checkout the specified branch
    git checkout "${BRANCH}"
    
    # Pull latest changes
    git pull origin "${BRANCH}"
    
    # Restore .env file if it was backed up
    if [ -f "${WEB_DIR}/.env.backup" ]; then
        mv "${WEB_DIR}/.env.backup" "${WEB_DIR}/.env" || warning "Failed to restore .env file"
        log ".env file preserved"
    fi
    
    log "Code updated successfully"
    log "Current commit: $(git rev-parse --short HEAD)"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "${WEB_DIR}"
    
    # Install packages with bun
    bun install --frozen-lockfile
    
    log "Dependencies installed"
}

# Generate Prisma client
generate_prisma() {
    log "Generating Prisma client..."
    
    cd "${WEB_DIR}"
    
    bunx prisma generate
    
    log "Prisma client generated"
}

# Build the application
build_app() {
    log "Building application..."
    
    cd "${WEB_DIR}"
    
    # Run build
    bun run build
    
    log "Build completed successfully"
}

# Restart PM2 process
restart_pm2() {
    log "Restarting PM2 process..."
    
    cd "${WEB_DIR}"
    
    # Check if PM2 process exists
    if pm2 list | grep -q "${PM2_NAME}"; then
        log "Restarting existing PM2 process: ${PM2_NAME}"
        pm2 restart "${PM2_NAME}"
    else
        log "Starting new PM2 process: ${PM2_NAME}"
        pm2 start bun --name "${PM2_NAME}" -- start -- -p ${PORT}
        pm2 save
    fi
    
    # Wait a moment for the process to start
    sleep 2
    
    # Check PM2 status
    pm2 status
    
    log "PM2 process restarted"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local max_attempts=10
    local attempt=1
    
    # Check if the server responds on the port
    while [ $attempt -le $max_attempts ]; do
        # Try to connect to the port
        if curl -f -s --max-time 5 "http://localhost:${PORT}" > /dev/null 2>&1 || \
           nc -z localhost ${PORT} 2>/dev/null; then
            log "Health check passed - server is responding on port ${PORT}"
            return 0
        fi
        
        warning "Health check attempt ${attempt}/${max_attempts} failed, retrying..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    warning "Health check failed after ${max_attempts} attempts"
    warning "Server may still be starting up. Please check manually with: pm2 logs ${PM2_NAME}"
    return 0  # Don't fail deployment, just warn
}

# Main deployment function
main() {
    log "Starting deployment for ${ENVIRONMENT} environment..."
    log "Branch: ${BRANCH}"
    log "App directory: ${APP_DIR}"
    
    # Pre-deployment checks
    check_permissions
    
    # Verify app directory exists
    if [ ! -d "${APP_DIR}" ]; then
        error "App directory not found: ${APP_DIR}"
        error "Please clone the repository first:"
        error "  sudo mkdir -p /var/www"
        error "  cd /var/www"
        error "  sudo git clone https://github.com/mingster/riben.life.git"
        exit 1
    fi
    
    # Create backup before deployment
    create_backup
    
    # Deployment steps
    local deployment_failed=false
    
    if ! update_code; then
        deployment_failed=true
    fi
    
    if [ "$deployment_failed" = false ] && ! install_dependencies; then
        deployment_failed=true
    fi
    
    if [ "$deployment_failed" = false ] && ! generate_prisma; then
        deployment_failed=true
    fi
    
    if [ "$deployment_failed" = false ] && ! build_app; then
        deployment_failed=true
    fi
    
    if [ "$deployment_failed" = false ] && ! restart_pm2; then
        deployment_failed=true
    fi
    
    # Health check
    if [ "$deployment_failed" = false ]; then
        if ! health_check; then
            warning "Health check failed, but deployment completed"
            warning "Please check the application manually"
        fi
    fi
    
    # Handle deployment failure
    if [ "$deployment_failed" = true ]; then
        error "Deployment failed! Restoring from backup..."
        restore_backup
        restart_pm2
        error "Deployment rolled back to previous version"
        exit 1
    fi
    
    log "Deployment completed successfully!"
    log "Application is running on port ${PORT}"
    log "PM2 process: ${PM2_NAME}"
    
    # Show PM2 logs
    log "Recent PM2 logs:"
    pm2 logs "${PM2_NAME}" --lines 10 --nostream
}

# Run main function
main "$@"


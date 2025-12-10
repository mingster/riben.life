#!/bin/bash

# Remote deployment script for Ubuntu platform
# This script runs on your local machine and deploys to a remote Ubuntu server
# Usage: ./bin/deploy-ubuntu-remote.sh [production|staging] [branch] [server_user@server_host]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="${1:-production}"
BRANCH="${2:-main}"
REMOTE_SERVER="${3:-root@mx2.mingster.com}"
APP_DIR="/var/www/riben.life"
WEB_DIR="${APP_DIR}/web"

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

# Check SSH connection
check_ssh() {
    log "Checking SSH connection to ${REMOTE_SERVER}..."
    
    if ! ssh -o ConnectTimeout=5 -o BatchMode=yes "${REMOTE_SERVER}" exit 2>/dev/null; then
        error "Cannot connect to ${REMOTE_SERVER}"
        error "Please ensure:"
        error "  1. SSH key is set up and added to authorized_keys"
        error "  2. Server is accessible"
        error "  3. User has sudo privileges"
        exit 1
    fi
    
    log "SSH connection successful"
}

# Upload deployment script to server
upload_deploy_script() {
    log "Uploading deployment script to server..."
    
    # Create a temporary script file
    local script_content=$(cat <<'EOF'
#!/bin/bash
set -e

ENVIRONMENT="${1:-production}"
BRANCH="${2:-main}"
APP_DIR="/var/www/riben.life"
WEB_DIR="${APP_DIR}/web"
PORT=3001
PM2_NAME="riben.life"

log() { echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"; }
error() { echo "[ERROR] $1" >&2; }
warning() { echo "[WARNING] $1"; }

log "Starting deployment for ${ENVIRONMENT} environment..."

# Create backup
log "Creating backup..."
backup_dir="${APP_DIR}/backups/$(date +'%Y%m%d_%H%M%S')"
mkdir -p "${backup_dir}"
if [ -d "${WEB_DIR}/.next" ]; then
    cp -r "${WEB_DIR}/.next" "${backup_dir}/.next" || warning "Failed to backup .next"
fi
echo "${backup_dir}" > "${APP_DIR}/.last_backup"

# Update code
log "Updating code from git (branch: ${BRANCH})..."
cd "${APP_DIR}"
git fetch origin
git checkout "${BRANCH}"
git pull origin "${BRANCH}"
log "Current commit: $(git rev-parse --short HEAD)"

# Install dependencies
log "Installing dependencies..."
cd "${WEB_DIR}"
bun install --frozen-lockfile

# Generate Prisma
log "Generating Prisma client..."
bunx prisma generate

# Build
log "Building application..."
bun run build

# Restart PM2
log "Restarting PM2 process..."
cd "${WEB_DIR}"
if pm2 list | grep -q "${PM2_NAME}"; then
    pm2 restart "${PM2_NAME}"
else
    pm2 start bun --name "${PM2_NAME}" -- start -- -p ${PORT}
    pm2 save
fi
sleep 2
pm2 status

log "Deployment completed successfully!"
EOF
)
    
    # Write script to remote server
    echo "$script_content" | ssh "${REMOTE_SERVER}" "cat > /tmp/deploy-riben.sh && chmod +x /tmp/deploy-riben.sh"
    
    log "Deployment script uploaded"
}

# Run deployment on remote server
run_deployment() {
    log "Running deployment on remote server..."
    
    ssh "${REMOTE_SERVER}" "/tmp/deploy-riben.sh ${ENVIRONMENT} ${BRANCH}"
}

# Main function
main() {
    log "Starting remote deployment..."
    log "Environment: ${ENVIRONMENT}"
    log "Branch: ${BRANCH}"
    log "Remote server: ${REMOTE_SERVER}"
    
    check_ssh
    upload_deploy_script
    run_deployment
    
    log "Remote deployment completed!"
}

# Run main function
main "$@"


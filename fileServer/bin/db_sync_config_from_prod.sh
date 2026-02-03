#!/bin/bash
#
# script to backup postgres configuration files from production to this machine
# synced files are chown'd to postgres:postgres so ownership matches production
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_STM36="${SCRIPT_DIR}/../backup/production/db/stm36.tvcdn.org"
BACKUP_STM39="${SCRIPT_DIR}/../backup/production/db/stm39.tvcdn.org"
BACKUP_MX2="${SCRIPT_DIR}/../backup/production/db/mx2.mingster.com"

rsync -avz --exclude='*.log' --exclude='backup' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    root@stm36.tvcdn.org:/etc/postgresql/ \
    "${BACKUP_STM36}/"

rsync -avz --exclude='*.log' --exclude='backup' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    root@stm39.tvcdn.org:/etc/postgresql/ \
    "${BACKUP_STM39}/"

#sudo chown -R postgres:postgres "${BACKUP_STM36}"

rsync -avz --exclude='*.log' --exclude='backup' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    root@mx2.mingster.com:/etc/postgresql/ \
    "${BACKUP_MX2}/"

#sudo chown -R postgres:postgres "${BACKUP_MX2}"
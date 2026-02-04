#!/bin/bash
#
# Push postgres config from local backup to production.
# Uses --no-owner --no-group so file ownership on the server is not changed by the transfer.
#

rsync -avz --exclude='*.log' --exclude='backup' \
    --include='*.conf' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    ../backup/production/db/stm36.tvcdn.org/18/main/ \
    root@stm36.tvcdn.org:/etc/postgresql/18/main/

ssh root@stm36.tvcdn.org "chown -R postgres:postgres /etc/postgresql/18/main/*.conf"

rsync -avz --exclude='*.log' --exclude='backup' \
    --include='*.conf' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    ../backup/production/db/stm39.tvcdn.org/18/main/ \
    root@stm39.tvcdn.org:/etc/postgresql/18/main/

ssh root@stm39.tvcdn.org "chown -R postgres:postgres /etc/postgresql/18/main/*.conf"

rsync -avz --exclude='*.log' --exclude='backup' \
    --include='*.conf' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    ../backup/production/db/mx2.mingster.com/18/main/ \
    root@mx2.mingster.com:/etc/postgresql/18/main/

 ssh root@mx2.mingster.com "chown -R postgres:postgres /etc/postgresql/18/main/*.conf"
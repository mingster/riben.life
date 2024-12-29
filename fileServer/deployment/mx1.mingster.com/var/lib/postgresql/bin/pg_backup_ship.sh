#!/bin/bash

###########################
####### Ship backup to remote server(s) #######
###########################

BACKUP_DIR=/var/lib/postgresql/17/backup/

rsync -avz --delete --stats --progress --force --no-perms --no-owner --no-group --bwlimit=5000  $BACKUP_DIR root@stm36.tvcdn.org:$BACKUP_DIR

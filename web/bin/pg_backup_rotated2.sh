#!/bin/bash

###########################
####### LOAD CONFIG #######
###########################

while [ $# -gt 0 ]; do
    case $1 in
    -c)
        CONFIG_FILE_PATH="$2"
        shift 2
        ;;
    *)
        ${ECHO} "Unknown Option \"$1\"" 1>&2
        exit 2
        ;;
    esac
done

if [ -z $CONFIG_FILE_PATH ]; then
    SCRIPTPATH=$(cd ${0%/*} && pwd -P)
    CONFIG_FILE_PATH="${SCRIPTPATH}/pg_backup.config"
fi

if [ ! -r ${CONFIG_FILE_PATH} ]; then
    echo "Could not load config file from ${CONFIG_FILE_PATH}" 1>&2
    exit 1
fi

source "${CONFIG_FILE_PATH}"

###########################
#### PRE-BACKUP CHECKS ####
###########################

# Make sure we're running as the required backup user
if [ "$BACKUP_USER" != "" -a "$(id -un)" != "$BACKUP_USER" ]; then
    echo "This script must be run as $BACKUP_USER. Exiting." 1>&2
    exit 1
fi

###########################
### INITIALISE DEFAULTS ###
###########################

if [ ! $HOSTNAME ]; then
    HOSTNAME="localhost"
fi

if [ ! $USERNAME ]; then
    USERNAME="postgres"
fi

###########################
#### START THE BACKUPS ####
###########################

function perform_backups() {
    SUFFIX=$1
    FINAL_BACKUP_DIR=$BACKUP_DIR"/$(date +\%Y-\%m-\%d)/$SUFFIX/"

    echo "Making backup directory in $FINAL_BACKUP_DIR"

    if ! mkdir -p $FINAL_BACKUP_DIR; then
        echo "Cannot create backup directory in $FINAL_BACKUP_DIR. Go and fix it!" 1>&2
        exit 1
    fi

    #######################
    ###  Create a Full Backup ###
    #######################

    echo -e "\n\nPerforming Full Backup"
    echo -e "--------------------------------------------\n"

    if [ $ENABLE_GLOBALS_BACKUPS = "yes" ]; then
        echo "Full Backup"

        set -o pipefail
        pg_basebackup -D $FINAL_BACKUP_DIR
        set +o pipefail
    else
        echo "None"
    fi

    echo -e "\nAll database backups complete!"
}
function perform_incremental_backups() {
    BACKUP_DIR=$1
    DAILY_SUFFIX=$2
    SUFFIX="incremental"

    echo -e "\n\nPerforming Incremental Backup"
    echo -e "--------------------------------------------\n"

    echo "$BACKUP_DIR/$SUFFIX"

    # if incremental backup dir doesn't exist, create it
    if [ ! -d "$BACKUP_DIR$SUFFIX" ]; then
        echo "First Incremental Backup"

        set -o pipefail
        #pg_basebackup --incremental=/path/to/full_backup/backup_manifest -D /path/to/incremental_backup/
        pg_basebackup --incremental=$BACKUP_DIR$DAILY_SUFFIX/backup_manifest -D $BACKUP_DIR$SUFFIX/"first"
        set +o pipefail
    else
        # otherwise, do subsequent incremental backups
        echo '  '
        echo '  '
        echo "Subsequent Incremental Backup"
        #pg_basebackup --incremental=/path/to/incremental_backup/backup_manifest -D /path/to/next_incremental_backup/
        pg_basebackup --incremental=$BACKUP_DIR$SUFFIX/first/backup_manifest -D $BACKUP_DIR$SUFFIX/"$(date +%H_%M)"
    fi
}

echo -e "backup dir:"$BACKUP_DIR

# Delete daily backups 7 days old or more
if [ -d "$BACKUP_DIR" ]; then
    find $BACKUP_DIR -maxdepth 1 -mtime +$DAYS_TO_KEEP -name "*-daily" -exec rm -rf '{}' ';'
fi

# DAILY BACKUPS

SUFFIX="daily"
BASE_BACKUP_DIR=$BACKUP_DIR"/$(date +\%Y-\%m-\%d)/"

echo -e "working dir:""$BASE_BACKUP_DIR/$SUFFIX/"

if [ -d "$BACKUP_DIR"/$(date +\%Y-\%m-\%d)/$SUFFIX/"" ]; then
    #full backup exists

    echo '  '
    echo '  '
    echo 'do incremental backup'
    perform_incremental_backups $BASE_BACKUP_DIR $SUFFIX
    exit 0
else
    # do full backup
    perform_backups "daily"
    exit 0
fi

# MONTHLY BACKUPS

DAY_OF_MONTH=$(date +%d)

if [ $DAY_OF_MONTH -eq 1 ]; then
    # Delete all expired monthly directories
    find $BACKUP_DIR -maxdepth 1 -name "*-monthly" -exec rm -rf '{}' ';'

    perform_backups "monthly"

    exit 0
fi

# WEEKLY BACKUPS

DAY_OF_WEEK=$(date +%u) #1-7 (Monday-Sunday)
EXPIRED_DAYS=$(expr $((($WEEKS_TO_KEEP * 7) + 1)))

if [ $DAY_OF_WEEK = $DAY_OF_WEEK_TO_KEEP ]; then
    # Delete all expired weekly directories
    find $BACKUP_DIR -maxdepth 1 -mtime +$EXPIRED_DAYS -name "*-weekly" -exec rm -rf '{}' ';'

    perform_backups "weekly"

    exit 0
fi

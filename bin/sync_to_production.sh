#!/bin/zsh
echo 'sync db server config from here to production.'

makedir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

HOME=~/projects/riben.life/fileServer/deployment/
cd $HOME

echo '  '
echo '  '
echo 'sync config'

rsync -avz --exclude='*.log' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    $HOME/mx2.mingster.com/etc/postgresql/ \
    root@mx2.mingster.com:/etc/postgresql/

echo '  '
echo '  '
echo 'sync bin scripts'
rsync -avz --exclude='*.log' --exclude='backup' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    $HOME/mx2.mingster.com/var/lib/postgresql/17/bin/ \
    root@mx2.mingster.com:/var/lib/postgresql/17/bin/

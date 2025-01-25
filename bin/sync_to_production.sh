#!/bin/zsh
echo 'sync db server config from here to production.'

makedir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

HOME=~/projects/riben.life/fileServer/deployment/
cd $HOME

rsync -avz --exclude='*.log' --include='*.conf' \
    --delete --no-perms --no-owner --no-group \
    $HOME/mx2.mingster.com/etc/postgresql/ \
    root@mx2.mingster.com:/etc/postgresql/

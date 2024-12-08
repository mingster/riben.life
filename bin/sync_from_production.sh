#!/bin/zsh
echo 'sync db server config from production to this machine.'

makedir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

HOME=~/projects/riben.life/fileServer/deployment/
cd $HOME

rsync -avz --exclude='*.log' \
    --delete --no-perms --no-owner --no-group \
    root@mx1.mingster.com:/etc/postgresql/ \
    $HOME/mx1.mingster.com/etc/postgresql/

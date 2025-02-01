#!/bin/zsh
echo 'sync db server config from production to this machine.'

makedir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

HOME=~/projects/riben.life/fileServer/deployment/

command="makedir $HOME/mx2.mingster.com/etc/postgresql/; makedir $HOME/mx2.mingster.com/var/lib/postgresql/;"
#echo $command
eval $command

cd $HOME

rsync -avz --exclude='*.log' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    root@mx2.mingster.com:/etc/postgresql/ \
    $HOME/mx2.mingster.com/etc/postgresql/

rsync -avz --exclude='*.log' --exclude='backup' \
    --delete --no-perms --no-owner --no-group \
    --stats --progress --force \
    root@mx2.mingster.com:/var/lib/postgresql/ \
    $HOME/mx2.mingster.com/var/lib/postgresql/

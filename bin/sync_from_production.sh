#!/bin/zsh
echo 'sync db server config from production to this machine.'

makedir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
    fi
}

HOME=~/projects/riben.life/fileServer/deployment/
cd $HOME

cat server_list.txt | while read server; do
    full_name="${server}"
    echo '**************************' $full_name '**************************'

    command="makedir $HOME/$server; makedir $HOME/$server/etc; makedir $HOME/$server/var/lib/;"
    #echo $command
    eval $command

    echo '**************************' local bin
    rsync -avz --delete --no-perms --no-owner --no-group root@$full_name:~/bin $HOME/$server/

    echo '**************************' ssh keys
    rsync -avz --delete --no-perms --no-owner --no-group root@$full_name:~/.ssh $HOME/$server/

    echo '**************************' cron / csf / ufw / etc...
    rsync -avz --delete --no-perms --no-owner --no-group --include='crontab' --exclude='*' \
        root@$full_name:/etc/ $HOME/$server/etc/

    rsync -avz --delete --no-perms --no-owner --no-group --include='ufw.conf' --exclude='*' \
        root@$full_name:/etc/ufw/ $HOME/$server/etc/

    rsync -avz --delete --no-perms --no-owner --no-group \
        root@$full_name:/etc/sysctl.d $HOME/$server/etc/

    rsync -avz --delete --no-perms --no-owner --no-group \
        root@$full_name:/etc/sysctl.conf $HOME/$server/etc/

    echo '**************************' sshd / hosts
    rsync -avz --delete --no-perms --no-owner --no-group --include='sshd_config' --exclude='*' \
        root@$full_name:/etc/ssh/ $HOME/$server/etc/ssh/

    rsync -avz --delete --no-perms --no-owner --no-group --include='hosts.allow' --exclude='*' \
        root@$full_name:/etc/ $HOME/$server/etc/

    rsync -avz --delete --no-perms --no-owner --no-group --include='hosts.deny' --exclude='*' \
        root@$full_name:/etc/ $HOME/$server/etc/

    rsync -avz --delete --no-perms --no-owner --no-group --include='hosts' --exclude='*' \
        root@$full_name:/etc/ $HOME/$server/etc/

    #echo '**************************' letsencrypt ssl
    rsync -avz --delete --no-perms --no-owner --no-group root@$full_name:/etc/letsencrypt $HOME/$server/etc/

    #echo '**************************' postgres
    mkdir $HOME/$server/etc/postgresql/

    rsync -avz --exclude='*.log' \
        --delete --no-perms --no-owner --no-group \
        root@$full_name:/etc/postgresql/ $HOME/$server:/etc/postgresql/

    rsync -avz --exclude='*.log' \
        --delete --no-perms --no-owner --no-group \
        root@$full_name:/var/lib/pgsql/ $HOME/$server:/var/lib/pgsql/
done

# Depolyment - Postgres on Ubuntu

## Installation

1. Add the PostgreSQL Repository

    To install the latest version of PostgreSQL, add the official PostgreSQL Apt Repository:

    ``` bash
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
    ```

    Then, create a new configuration file for the repository:

    ``` bash
    echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list
    ```

1. Update Package Index
    Open a terminal and update your package index to ensure you have the latest information about available packages:

    ```bash
    sudo apt update -y && sudo apt upgrade
    sudo apt install wget ca-certificates
    ```

1. Install PostgreSQL:

    Install PostgreSQL by running:

    ``` bash
    sudo apt install postgresql postgresql-contrib
    ```

1. Start and Enable PostgreSQL Service:

    Start the service and enable it to run at boot time:

    ``` bash
    sudo systemctl enable postgresql
    sudo systemctl start postgresql
    ```

1. Check Service Status:

    Verify that PostgreSQL is active and running:

    ``` bash
    sudo systemctl status postgresql
    ```

1. Secure Your Installation (Optional):

    Set a password for the postgres user to enhance security:

    ``` bash
    sudo passwd postgres
    ```

    db user:

    ``` bash
    su -l postgres
    psql
    alter user postgres with encrypted password 'your_password';

    #sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'your_password';"
    ```

    Run the following command to change the default peer value in the scram-sha-256 field in the main PostgreSQL configuration file pg_hba.conf to enable password authentication on the server.

    ``` bash
    sudo sed -i '/^local/s/peer/scram-sha-256/' /etc/postgresql/18/main/pg_hba.conf
    ```

### SSL

1. install certbot

    ``` bash
    sudo apt install certbot
    ```

1. Request the SSL certificate

    ``` bash
    sudo certbot certonly --standalone -d the_host  --key-type rsa
    ```

    e.g.

    ``` bash
    sudo certbot certonly --standalone -d mx2.mingster.com  --key-type rsa
    ```

1. Copy Certificates

    You need to copy the generated certificates into the PostgreSQL config directory (usually ```/etc/postgresql/<version>/main/``` or similar). You can create symbolic links for easier management:

    ``` bash
    sudo cp /etc/letsencrypt/live/mx2.mingster.com/fullchain.pem /etc/postgresql/18/main/server.crt
    sudo cp /etc/letsencrypt/live/mx2.mingster.com/privkey.pem /etc/postgresql/18/main/server.key
    ```

1. Set Permissions

    ``` bash
    sudo chown postgres:postgres /etc/postgresql/18/main/server.crt /etc/postgresql/18/main/server.key

    sudo chmod 600 /etc/postgresql/18/main/server.crt /etc/postgresql/18/main/server.key
    ```

1. certbot post-hook

    Create the renewal hook file.

    ``` bash
    sudo nano /etc/letsencrypt/renewal-hooks/deploy/postgresql.deploy
    ```

    ``` bash
    #!/bin/bash
    umask 0187
    DOMAIN=mx2.mingster.com
    DATA_DIR=/etc/postgresql/18/main/
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $DATA_DIR/server.crt
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $DATA_DIR/server.key
    chown postgres:postgres $DATA_DIR/server.crt $DATA_DIR/server.key
    ```

    Give the file executable permissions:

    ``` bash
    sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/postgresql.deploy
    ```

    test:

    ``` bash
    sudo certbot renew --force-renewal
    ```

1. schedule it:

    ```bash
    crontab -e
    ```

    And add those line:

    ```bash
    # renew cert at 3:01AM everyday
    1   3   *   *   *   certbot renew
    ```

## Enable Remote Access

1. Modify the PostgreSQL Configuration File

    Open the postgresql.conf file, which is typically located in ```/var/lib/pgsql/data/``` or ```/etc/postgresql/<version>/main/```. Use a text editor like nano or vim:

    ``` bash
    sudo nano /etc/postgresql/18/main/postgresql.conf
    ```

    Find the line that contains listen_addresses, which is usually commented out:

    ``` text
    #listen_addresses = 'localhost'
    ```

    Uncomment those line and change them to:

    ``` text
    listen_addresses = '*'
    port = 5432

    ssl = on
    ssl_cert_file = '/etc/postgresql/18/main/server.crt'
    ssl_key_file = '/etc/postgresql/18/main/server.key'
    ssl_prefer_server_ciphers = on
    ```

1. Configure Client Authentication

    ``` bash
    sudo nano /etc/postgresql/18/main/pg_hba.conf
    ```

    Add the following line at the end of the file to allow connections from any IP address using sha-256 password authentication:

    ``` text
    # tc2
    hostssl    all     all     59.126.30.241/32       scram-sha-256

    # mx2
    hostssl    all     all     64.186.50.230/32       scram-sha-256
    ```

    This setting allows PostgreSQL to accept connections from the specifed IP address.

1. Restart PostgreSQL Service

    For the changes to take effect, restart the PostgreSQL service:

    ``` bash
    sudo systemctl restart postgresql
    sudo systemctl status postgresql
    ```

    For RHEL systems:

    ``` bash
    sudo systemctl restart postgresql-18
    sudo systemctl status postgresql-18
    ```

1. firewall

    ``` bash
    # allow only certain client(s)
    sudo ufw allow proto tcp from 59.126.30.241 to any port 5432
    ```

1. Verify Remote Access

    Is server running?

    ``` bash
    sudo ss -nlt | grep 5432
    ```

    To test if remote access is working, use a PostgreSQL client from another machine and attempt to connect:

    ``` bash
    psql -h <your_server_ip> -U <your_username> -d <your_database>
    ```

    e.g.

    ``` bash
    psql -h mx2.mingster.com -U postgres -d postgres
    ```

## Setup database

On the server:

``` bash
su -l postgres
psql
```

``` sql
# in the psql sessesion, create new user as follow:
CREATE ROLE PSTV_USER WITH LOGIN PASSWORD 'Sup3rS3cret';
#
# you can \du to list out users.
#
# allow PSTV_USER user to create db:
ALTER ROLE PSTV_USER CREATEDB;
#
#\q to quit psql
\q
```

On a clinet machine, reconnect using the new user:

``` sql
psql -h mx2.mingster.com -d postgres -U pstv_user

# Create new database and its permission:
CREATE DATABASE pstv_web;
GRANT ALL PRIVILEGES ON DATABASE pstv_web TO pstv_user;

\list
\connect pstv_web
\dt
\q
```

## Setup for Incremental Backups

1. Prerequisites

    Ensure you are using PostgreSQL 18 or later. Set up WAL summarization by executing:

    ``` bash
    su -l postgres
    psql
    ```

    ``` sql
    ALTER SYSTEM SET summarize_wal = on;
    SELECT pg_reload_conf();
    ```

    where is data directory?

    ``` sql
    SHOW data_directory;
    ```

1. Create a Full Backup
    First, perform a full backup using pg_basebackup:

    ``` bash
    pg_basebackup -D /path/to/full_backup/
    ```

    e.g.

    ``` bash
    mkdir /var/lib/postgresql/18/backup
    pg_basebackup -D /var/lib/postgresql/18/backup
    ```

1. Create an Incremental Backup

    After making changes to your database (e.g., adding tables or data), create an incremental backup:

    ``` bash
    pg_basebackup --incremental=/path/to/full_backup/backup_manifest -D /path/to/incremental_backup/
    ```

    e.g.

    ``` bash
    mkdir /var/lib/postgresql/18/incremental_backup
    pg_basebackup --incremental=/var/lib/postgresql/18/backup/backup_manifest -D /var/lib/postgresql/18/incremental_backup/
    ```

    The --incremental option requires the path to the manifest file from the previous full or incremental backup.

1. Subsequent Incremental Backups

    You can continue to create additional incremental backups based on previous ones:

    ``` bash
    pg_basebackup --incremental=/path/to/incremental_backup/backup_manifest -D /path/to/next_incremental_backup/
    ```

## Restoring from Incremental Backups

To restore from a combination of full and incremental backups, use the pg_combinebackup tool:

``` bash
pg_combinebackup -o /path/to/restore_directory /path/to/full_backup/ /path/to/incremental_backup/
```

## Automated Backup

1. copy ```$PROJECT_HOME/bin``` to production server

    ``` bash
    cd $PROJECT_HOME
    scp bin/* root@mx2.mingster.com://var/lib/postgresql/18/bin/
    ```

1. The setup on the production server:

    ``` bash
    chown postgres.postgres /var/lib/postgresql/18/bin/
    ```

1. To run the backup script manually:

    ``` bash
    su -l postgres /var/lib/postgresql/18/bin/pg_backup_rotated2.sh
    ```

### Schedule with Cron

To automate this script, you can add it to your crontab:

```bash
crontab -e
```

Add a line to schedule it (e.g., every 3 hours):

```bash
0 */3 * * * su postgres -c "/var/lib/postgresql/18/bin/pg_backup_rotated2.sh >> /var/log/postgresql/backup.log 2>&1"
```

Ship backup to other serever

```bash
0 */3 * * * su root -c "/var/lib/postgresql/18/bin/pg_backup_ship.sh >> /var/log/postgresql/backup.log 2>&1"
```

## Continuous Archiving and Point-in-Time Recovery

``` bash
chown -R postgres:postgres /var/lib/postgresql/
chmod -R 0750 /var/lib/postgresql/
```

## Postgres Streaming Replication

### Configure the Primary Server

1. Edit postgresql.conf:

    ``` bash
    sudo nano /etc/postgresql/18/main/postgresql.conf
    ```

    ``` text
    wal_level = replica
    max_wal_senders = 3
    ```

    ``` bash
    sudo systemctl start postgresql
    ```

1. Update pg_hba.conf to allow replication connections:

    ``` bash
    sudo nano /etc/postgresql/18/main/pg_hba.conf
    ```

    ``` text
    host replication all <standby_ip>/32 md5
    ```

1. Create a Replication Role:

    On the primary server, create a user for replication:

    ``` bash
    psql postgres -U postgres
    ```

    ``` sql
    # in the psql sessesion, create new user as follow:
    CREATE ROLE replica_user WITH REPLICATION LOGIN PASSWORD 'Sup3rS3cret';
    #
    # you can \du to list out users.

    #\q to quit psql
    \q
    ```

1. Restart

    ``` bash
    sudo systemctl restart postgresql
    ```

1. firewall

    allow standby server(s):

    ``` bash
    sudo ufw allow proto tcp from 107.150.35.210 to any port 5432
    sudo ufw allow proto tcp from 107.150.51.226 to any port 5432
    ```

### Set Up the Standby Server

1. Stop PostgreSQL on the standby server:

    ``` bash
    sudo systemctl stop postgresql
    ```

1. Use pg_basebackup to copy data from the primary:

    ``` bash
    pg_basebackup -h <primary_ip> -D $dest_dir -U replica_user -P --wal-method=stream
    ```

    e.g.

    ``` bash
    pg_basebackup -h mx2.mingster.com -D $desst_dir -U replica_user --wal-method=stream -P -v -R -X stream -C -S slaveslot1

    mv /var/lib/postgresql/18/main /var/lib/postgresql/18/main-old

    pg_basebackup -h mx2.mingster.com -D /var/lib/postgresql/18/main -U replica_user --wal-method=stream -P -v -R -X stream -C -S slaveslot1
    ```

1. change ownership

    ``` bash
    sudo chown -R postgres:postgres /var/lib/postgresql/18/main/
    chmod -R 0750 /var/lib/postgresql/18/main/
    ```

1. Start the Standby Server:

    ``` bash
    sudo systemctl start postgresql
    ```

    this will start a read-only server.

## Debug

``` bash
export ${PATH}:/usr/lib/postgresql/18/bin/
postgres -D /etc/postgresql/18/main/
```

``` bash
tail -f /var/log/postgresql/postgresql-18-main.log
```

## Uninstall

if you fuc'ed up the installation, you might [try this](https://neon.tech/postgresql/postgresql-administration/uninstall-postgresql-ubuntu).

## Ref

- [Comprehensive Guide: Setting Up PostgreSQL 18 on Ubuntu](https://www.sqlpassion.at/archive/2024/10/14/comprehensive-guide-setting-up-postgresql-18-on-ubuntu-24-04/)
- [How to Install PostgreSQL on Ubuntu](https://docs.vultr.com/how-to-install-postgresql-on-ubuntu-24-04)
- [Use SSL Encryption with PostgreSQL on Ubuntu](https://docs.vultr.com/use-ssl-encryption-with-postgresql-on-ubuntu-20-04)
- [How To Set Up Continuous Archiving and Perform Point-In-Time-Recovery with PostgreSQL](https://www.digitalocean.com/community/tutorials/how-to-set-up-continuous-archiving-and-perform-point-in-time-recovery-with-postgresql-12-on-ubuntu-20-04)

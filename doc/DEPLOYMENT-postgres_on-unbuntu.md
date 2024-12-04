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
    sudo apt upgrade && sudo apt update
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
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
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
    sudo sed -i '/^local/s/peer/scram-sha-256/' /etc/postgresql/17/main/pg_hba.conf
    ```

### SSL

1. Copy Certificates

    You need to copy the generated certificates into the PostgreSQL config directory (usually ```/etc/postgresql/<version>/main/``` or similar). You can create symbolic links for easier management:

    ``` bash
    sudo cp /etc/letsencrypt/live/mx1.mingster.com/fullchain.pem /etc/postgresql/17/main/server.crt
    sudo cp /etc/letsencrypt/live/mx1.mingster.com/privkey.pem /etc/postgresql/17/main/server.key
    ```

1. Set Permissions

    ``` bash
    sudo chown postgres:postgres /etc/postgresql/17/main/server.crt /etc/postgresql/17/main/server.key

    sudo chmod 600 /etc/postgresql/17/main/server.crt /etc/postgresql/17/main/server.key
    ```

1. certbot post-hook

    Create the renewal hook file.

    ``` bash
    sudo nano /etc/letsencrypt/renewal-hooks/deploy/postgresql.deploy
    ```

    ``` bash
    #!/bin/bash
    umask 0177
    DOMAIN=mx1.mingster.com
    DATA_DIR=/etc/postgresql/17/main/
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

## Enable Remote Access

1. Modify the PostgreSQL Configuration File

    Open the postgresql.conf file, which is typically located in ```/var/lib/pgsql/data/``` or ```/etc/postgresql/<version>/main/```. Use a text editor like nano or vim:

    ``` bash
    sudo nano /etc/postgresql/17/main/postgresql.conf
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
    ssl_cert_file = '/etc/postgresql/17/main/server.crt'
    ssl_key_file = '/etc/postgresql/17/main/server.key'
    ssl_prefer_server_ciphers = on
    ```

1. Configure Client Authentication

    ``` bash
    sudo nano /etc/postgresql/17/main/pg_hba.conf
    ```

    Add the following line at the end of the file to allow connections from any IP address using MD5 password authentication:

    ``` text
    # tc2
    hostssl    all     all     220.135.171.33/32       md5

    # stm36
    hostssl    all     all     192.154.111.78/32       md5
    ```

    This setting allows PostgreSQL to accept connections from the specifed IP address.

1. Restart PostgreSQL Service

    For the changes to take effect, restart the PostgreSQL service:

    ``` bash
    sudo systemctl restart postgresql
    sudo systemctl status postgresql
    ```

1. firewall

    ``` bash
    sudo ufw allow 5432
    ```

1. Verify Remote Access

    To test if remote access is working, use a PostgreSQL client from another machine and attempt to connect:

    ``` bash
    sudo ss -nlt | grep 5432


    psql -h <your_server_ip> -U <your_username> -d <your_database>
    ```

    e.g.

    ``` bash
    psql -h mx1.mingster.com -U postgres -d postgres
    ```

## Setup database

``` bash
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

reconnect using the new user

``` sql
psql postgres -U pstv_user

# Create new database and its permission:
CREATE DATABASE pstv_web;
GRANT ALL PRIVILEGES ON DATABASE pstv_web TO pstv_user;

\list
\connect pstv_web
\dt
\q
```

## Ref

- [Comprehensive Guide: Setting Up PostgreSQL 17 on Ubuntu](https://www.sqlpassion.at/archive/2024/10/14/comprehensive-guide-setting-up-postgresql-17-on-ubuntu-24-04/)
- [How to Install PostgreSQL on Ubuntu](https://docs.vultr.com/how-to-install-postgresql-on-ubuntu-24-04)
- [Use SSL Encryption with PostgreSQL on Ubuntu](https://docs.vultr.com/use-ssl-encryption-with-postgresql-on-ubuntu-20-04)

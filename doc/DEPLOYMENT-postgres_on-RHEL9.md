# Depolyment - Postgres on RHEL 9

## Installation

1. Add PostgreSQL Repository:
First, add the PostgreSQL repository for version 16 (or whichever version you need):

```bash
sudo dnf install https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm -y
```

1. Disable Built-in PostgreSQL Module:

Disable the default PostgreSQL module to avoid conflicts:

``` bash
sudo dnf -qy module disable postgresql
```

1. Install PostgreSQL:

Install PostgreSQL by running:

``` bash
sudo dnf install postgresql16-server -y
```

1. Initialize the Database:

Initialize the database with:

``` bash
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb
```

1. Start and Enable PostgreSQL Service:

Start the service and enable it to run at boot time:

``` bash
sudo systemctl start postgresql-16
sudo systemctl enable postgresql-16
```

1. Check Service Status:

Verify that PostgreSQL is active and running:

``` bash
sudo systemctl status postgresql-16
```

1. Secure Your Installation (Optional):

Set a password for the postgres user to enhance security:

``` bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'your_password';"
```

1. Edit pg_hba.conf for Remote Access (Optional):

If you need to allow remote connections, edit the pg_hba.conf file located at /var/lib/pgsql/17/data/pg_hba.conf and change local authentication settings as needed.

By following these steps, you can successfully install and configure PostgreSQL on your RHEL system, ensuring that your database server is ready for use.

### SSL

1. Link Certificates

    You need to copy the generated certificates into the PostgreSQL data directory (usually /var/lib/pgsql/data/ or similar). You can create symbolic links for easier management:

    ``` bash
    sudo cp /etc/letsencrypt/live/stm36.tvcdn.org/fullchain.pem /var/lib/pgsql/17/data/server.crt
    sudo cp /etc/letsencrypt/live/stm36.tvcdn.org/privkey.pem /var/lib/pgsql/17/data/server.key
    ```

1. Set Permissions

    ``` bash
    sudo chown postgres:postgres /var/lib/pgsql/17/data/server.crt /var/lib/pgsql/17/data/server.key

    sudo chmod 600 /var/lib/pgsql/17/data/server.crt /var/lib/pgsql/17/data/server.key
    ```

## Enable Remote Access

1. Modify the PostgreSQL Configuration File

    Open the postgresql.conf file, which is typically located in /var/lib/pgsql/data/ or /etc/postgresql/<version>/main/. Use a text editor like nano or vim:

    ``` bash
    sudo nano /var/lib/pgsql/17/data/postgresql.conf
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
    ssl_cert_file = 'server.crt'
    ssl_key_file = 'server.key'
    ```

1. Configure Client Authentication

    ``` bash
    sudo nano /var/lib/pgsql/17/data/pg_hba.conf
    ```

    Add the following line at the end of the file to allow connections from any IP address using MD5 password authentication:

    ``` text
    # tc2
    host    all     all     220.135.171.33/32       md5
    ```

    This setting allows PostgreSQL to accept connections from the specifed IP address.

1. Restart PostgreSQL Service

    For the changes to take effect, restart the PostgreSQL service:

    ``` bash
    sudo systemctl restart postgresql-16
    sudo systemctl status postgresql-16
    ```

1. firewall

    ``` bash
    sudo ufw allow 5432
    ```

1. Verify Remote Access

    To test if remote access is working, use a PostgreSQL client from another machine and attempt to connect:

    ``` bash
    psql -h <your_server_ip> -U <your_username> -d <your_database>
    ```

    e.g.

    ``` bash
    psql -h stm36.tvcdn.org -U postgres -d postgres
    ```

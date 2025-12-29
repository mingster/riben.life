# Deployment - Postgres on RHEL 9

## Installation

1. Disable Built-in PostgreSQL Module:

    Disable the default PostgreSQL module to avoid conflicts:

    ``` bash
    sudo dnf -qy module disable postgresql
    ```

1. Add PostgreSQL Repository:

    First, add the PostgreSQL repository for version 18 (or whichever version you need):

    ```bash
    sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-9-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    ```

1. Install PostgreSQL:

    Install PostgreSQL by running:

    ``` bash
    sudo dnf install -y postgresql18-server
    ```

1. Initialize the Database:

    Initialize the database with:

    ``` bash
    sudo /usr/pgsql-17/bin/postgresql-17-setup initdb
    ```

1. Start and Enable PostgreSQL Service:

    Start the service and enable it to run at boot time:

    ``` bash
    sudo systemctl enable postgresql-17
    sudo systemctl start postgresql-17
    ```

1. Check Service Status:

    Verify that PostgreSQL is active and running:

    ``` bash
    sudo systemctl status postgresql-17
    ```

1. make link to match with ubuntu system

    ``` bash
    mkdir -p /etc/postgresql/17/
    ln -s -f /var/lib/pgsql/17/data /etc/postgresql/17/main
    ```

1. Follow the rest of setup in [Depolyment - Postgres on Ubuntu](./DEPLOYMENT-postgres.md).

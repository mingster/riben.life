# Deployment – PostgreSQL on Ubuntu

**Related:** [ENVIRONMENT_VARIABLES](../../ENVIRONMENT_VARIABLES.md)

## Overview

This guide covers installing and configuring PostgreSQL 18 on Ubuntu: repository setup, service management, SSL with Let’s Encrypt, remote access, database creation, incremental backups, streaming replication, and a two-node HA setup.

---

## Installation

### 1. Add the PostgreSQL repository

Install the latest PostgreSQL by adding the official Apt repository:

```bash
sudo install -d /usr/share/postgresql-common/pgdg
sudo mkdir -m 0755 -p /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
```

Create the repository configuration:

```bash
sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
```

### 2. Update package index and install dependencies

```bash
sudo apt update -y && sudo apt upgrade -y
sudo apt install -y curl ca-certificates gnupg wget ca-certificates certbot
```

### 3. Install PostgreSQL

```bash
sudo apt install -y postgresql-18 postgresql-client-18
```

### 4. Start and enable the service

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
sudo pg_isready
```

### 5. Secure the installation

Set a password for the `postgres` OS user:

```bash
sudo passwd postgres
```

Set the database password and enable password authentication:

```bash
sudo -u postgres psql

ALTER USER postgres WITH PASSWORD 'your_password'
```

Update `pg_hba.conf` to use `scram-sha-256` instead of `peer` for local connections so password auth is used. Edit `/etc/postgresql/18/main/pg_hba.conf` and set the appropriate local line to `scram-sha-256`.

---

## SSL (Let’s Encrypt)

### 1. Install Certbot

```bash
sudo apt install certbot
```

### 2. Request a certificate

Replace `your_host` with your server hostname (e.g. `stm39.tvcdn.org`):

```bash
sudo certbot certonly --standalone -d your_host --key-type rsa
```

### 3. Copy certificates into PostgreSQL config

```bash
sudo cp /etc/letsencrypt/live/your_host/fullchain.pem /etc/postgresql/18/main/server.crt
sudo cp /etc/letsencrypt/live/your_host/privkey.pem /etc/postgresql/18/main/server.key
```

### 4. Set permissions

```bash
sudo chown postgres:postgres /etc/postgresql/18/main/server.crt /etc/postgresql/18/main/server.key
sudo chmod 600 /etc/postgresql/18/main/server.crt /etc/postgresql/18/main/server.key
```

### 5. Certbot deploy hook for renewal

Create `/etc/letsencrypt/renewal-hooks/deploy/postgresql.deploy`:

```bash
#!/bin/bash
umask 0187
DOMAIN=your_host   # e.g. stm39.tvcdn.org
DATA_DIR=/etc/postgresql/18/main/
systemctl stop nginx
cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $DATA_DIR/server.crt
cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $DATA_DIR/server.key
chown postgres:postgres $DATA_DIR/server.crt $DATA_DIR/server.key
```

Make it executable:

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/postgresql.deploy
```

Test renewal:

```bash
sudo certbot renew --force-renewal
```

### 6. Schedule renewal (cron)

```bash
crontab -e
```

Add (renew daily at 3:01 AM):

```bash
1 3 * * * certbot renew
```

---

## Enable remote access

### 1. Edit postgresql.conf

```bash
sudo nano /etc/postgresql/18/main/postgresql.conf
```

Set:

- `listen_addresses = '*'`
- `port = 5432`
- If using SSL: `ssl = on`, `ssl_cert_file`, `ssl_key_file`, `ssl_prefer_server_ciphers = on`

Example SSL block:

```bash
listen_addresses = '*'
port = 5432
ssl = on
ssl_cert_file = '/etc/postgresql/18/main/server.crt'
ssl_key_file = '/etc/postgresql/18/main/server.key'
ssl_prefer_server_ciphers = on
```

### 2. Configure client authentication (pg_hba.conf)

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

Add host rules for each allowed client IP (replace with your app/server IPs):

```bash
# Example: allow client at 43.213.66.99
host    all  all  43.213.66.99/32  scram-sha-256
hostssl all  all  43.213.66.99/32  scram-sha-256
```

Use one pair per client; add more as needed. Do not commit real IPs or credentials to version control.

### 3. Restart PostgreSQL

```bash
sudo rm -rf /var/log/postgresql/postgresql-18-main.log
sudo systemctl restart postgresql
tail -f /var/log/postgresql/postgresql-18-main.log
```

### 4. Firewall

Allow PostgreSQL only from known client IPs:

```bash
#sudo ufw allow proto tcp from CLIENT_IP to any port 5432

sudo ufw allow proto tcp from 59.126.30.241 to any port 5432    #tc2
sudo ufw allow proto tcp from 63.141.238.242 to any port 5432   #stm36
sudo ufw allow proto tcp from 107.150.35.210 to any port 5432   #stm39
sudo ufw allow proto tcp from 64.176.50.230 to any port 5432    #mx2

sudo ufw reload
```

### 5. Verify

Check that the server is listening:

```bash
sudo ss -nlt | grep 5432
```

---

## Set up the database

### On the server (as postgres)

```bash
sudo -u postgres psql
```

In `psql`:

```sql
CREATE ROLE your_app_user WITH LOGIN PASSWORD 'your_password';
ALTER ROLE your_app_user CREATEDB;
\q
```

### Test the app_user from client machine

```bash
psql -h your_server_host -d postgres -U your_app_user
```

### create db

In `psql` on the server:

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE your_database;
GRANT ALL PRIVILEGES ON DATABASE your_database TO your_app_user;
\list
\connect your_database
\dt
\q
```

Replace `your_app_user`, `your_password`, `your_database`, and `your_server_host` with your values.

- grant public schema

``` bash
sudo -u postgres psql -d 你的資料庫名稱
```

進入後執行以下 SQL：

```sql
-- 授與目前使用者在 public schema 下建立物件的權限
GRANT ALL ON SCHEMA public TO postgres;

-- 確保 public schema 的擁有者是 postgres
ALTER SCHEMA public OWNER TO postgres;
```

---

## Debugging

Run the server in the foreground (for debugging):

```bash
export PATH=$PATH:/usr/lib/postgresql/18/bin
sudo -u postgres postgres -D /etc/postgresql/18/main/
```

Watch the log:

```bash
tail -f /var/log/postgresql/postgresql-18-main.log
```

## Two-node HA: stm39.tvcdn.org and stm36.tvcdn.org

This section configures two servers so one is the **primary** (read-write) and the other is a **standby** (streaming replica). If the primary is down, the standby can be promoted and used immediately. Each server can also hold backups of the other.

**Roles**

| Server             | Role     | When primary is up       | After failover (if stm36 is down) |
|--------------------|----------|--------------------------|------------------------------------|
| stm36.tvcdn.org    | Primary  | Read-write, accepts app  | Offline or later re-synced as standby |
| stm39.tvcdn.org    | Standby  | Read-only replica        | **Promoted to primary** (app points here) |

**Outcome**

- **Replication:** stm36 → stm39.tvcdn.org (streaming). stm39.tvcdn.org is a live mirror of stm36.
- **Failover:** If stm36 is down, promote stm39.tvcdn.org to primary and point the app at stm39.tvcdn.org.
- **Backup:** Primary runs backups; you can copy them to the other server so each host holds backups.

**Prerequisites**

- PostgreSQL 18 installed on both servers (see [Installation](#installation)).
- Both can reach each other on port 5432 (resolve hostnames to IPs for `pg_hba.conf` and firewall).

### 1. Resolve hostnames to IPs

Use these when configuring `pg_hba.conf` and firewall (replace with your actual IPs if different):

```bash
# On either server
getent hosts stm39.tvcdn.org
getent hosts stm36.tvcdn.org
```

Example: if stm36 → `63.141.238.242` and stm39.tvcdn.org → `64.176.50.230`, use those in the steps below.

### 2. Primary (stm36.tvcdn.org)

**2.1 postgresql.conf**

```bash
sudo nano /etc/postgresql/18/main/postgresql.conf
```

Set or add:

```text
listen_addresses = '*'
wal_level = replica
max_wal_senders = 3
max_replication_slots = 2
hot_standby = on
```

**2.2 Replication user**

```bash
sudo -u postgres psql
```

```psql
CREATE ROLE replica_user WITH REPLICATION LOGIN PASSWORD 'the_repl_password'
```

**2.3 pg_hba.conf** – allow stm39.tvcdn.org to replicate (use stm39.tvcdn.org's IP)

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

Add (replace `64.176.50.230` with stm39.tvcdn.org's IP):

```text
host    replication  replica_user  64.176.50.230/32  scram-sha-256
host    all          all           64.176.50.230/32  scram-sha-256
hostssl all          all           64.176.50.230/32  scram-sha-256
```

**2.4 Firewall**

```bash
sudo ufw allow from 64.176.50.230 to any port 5432
sudo ufw reload
```

**2.5 Restart**

```bash
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### 3. Standby (stm39.tvcdn.org)

**3.1 Stop PostgreSQL**

```bash
sudo systemctl stop postgresql
```

**3.2 Rename existing data dir (if it has data you can drop)**

```bash
sudo mv /var/lib/postgresql/18/main /var/lib/postgresql/18/main-old
```

**3.3 Base backup from primary** (creates standby data dir and replication slot)

Replace `your_replica_password` with the password you set on stm36:

```bash
sudo -u postgres pg_basebackup -h stm36.tvcdn.org -D /var/lib/postgresql/18/main -U replica_user -P -v -R -X stream -C -S standby_slot1
```

`-R` creates `standby.signal` and `primary_conninfo` in the data dir so this instance starts as a standby.

**3.4 Permissions**

```bash
sudo chown -R postgres:postgres /var/lib/postgresql/18/main
sudo chmod -R 0750 /var/lib/postgresql/18/main
```

**3.5 Start standby (read-only)**

```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

**3.6 Verify replication**

On **stm36** (primary):

```bash
sudo -u postgres psql -c "SELECT application_name, state, sent_lsn, write_lsn, flush_lsn FROM pg_stat_replication;"
```

You should see one row for `standby_slot1` with `state = stream`.

### 4. Application connection

- **Normal:** Point your app's `DATABASE_URL` at **stm36.tvcdn.org** (primary).
- **After failover:** Point `DATABASE_URL` at **stm39.tvcdn.org** (promoted primary).

Use a single host in the connection string. For automatic failover you'd add a VIP or a tool (e.g. Patroni, HAProxy); here we assume manual or scripted switch of the connection string after promotion.

### 5. Failover: bring standby online when primary is down

When **stm36 is down** and you want stm39.tvcdn.org to serve traffic:

**5.1 On stm39 – promote to primary**

```bash
sudo -u postgres /usr/lib/postgresql/18/bin/pg_ctl promote -D /var/lib/postgresql/18/main
```

Or with `pg_promote()` (from any session connected to stm39.tvcdn.org):

```bash
sudo -u postgres psql -c "SELECT pg_promote();"
```

**5.2 Restart PostgreSQL on stm39.tvcdn.org** (so it fully runs as primary)

```bash
sudo systemctl restart postgresql
```

**5.3 Point application to stm39.tvcdn.org**

Set `DATABASE_URL` (or your config) to use **stm39.tvcdn.org** as the database host. Restart or redeploy the app so it connects to the new primary.

stm39.tvcdn.org is now the only primary; stm36 is offline. When stm36 comes back, see [Failback](#6-failback-re-sync-stm36-as-standby-optional) to make stm36 a standby again.

### 6. Failback: re-sync stm36 as standby (optional)

After failover, stm39.tvcdn.org is primary and stm36 is offline. When stm36 is back, you can make stm36 a standby of stm39.tvcdn.org so replication runs stm39.tvcdn.org → stm36 (reverse of original).

**6.1 On stm39.tvcdn.org (current primary)** – allow stm36 to replicate

Add stm36's IP to `pg_hba.conf` on stm39.tvcdn.org:

```
host  replication  replica_user  63.141.238.242/32  scram-sha-256
host  all          all           63.141.238.242/32  scram-sha-256
```

Ensure `postgresql.conf` has `wal_level = replica`, `max_wal_senders = 3`, `max_replication_slots = 2`. Create replication user if not present:

```bash
sudo -u postgres psql -c "CREATE ROLE replica_user WITH REPLICATION LOGIN PASSWORD 'your_replica_password';"
```

Open firewall for stm36's IP, then restart PostgreSQL on stm39.tvcdn.org.

**6.2 On stm36** – re-clone from stm39.tvcdn.org

Stop PostgreSQL, move old data aside, and take a new base backup from stm39.tvcdn.org:

```bash
sudo systemctl stop postgresql
sudo mv /var/lib/postgresql/18/main /var/lib/postgresql/18/main-old
sudo -u postgres pg_basebackup -h stm39.tvcdn.org -D /var/lib/postgresql/18/main -U replica_user -P -v -R -X stream -C -S standby_slot_stm36
sudo chown -R postgres:postgres /var/lib/postgresql/18/main
sudo chmod -R 0750 /var/lib/postgresql/18/main
sudo systemctl start postgresql
```

Replication is now stm39.tvcdn.org (primary) → stm36 (standby). To switch back to stm36 as primary later, promote stm36 and point the app to stm36 again (and optionally re-sync stm39.tvcdn.org as standby of stm36 by repeating a similar process).

### 7. Backup each server

- **Primary (stm36 when it is primary):** Run your usual backup (e.g. `pg_backup_rotated2.sh` or `pg_basebackup`) on stm36. Optionally rsync/scp the backup directory to stm39.tvcdn.org so stm39.tvcdn.org also holds a copy of stm36's backups.
- **Standby (stm39.tvcdn.org):** While it is a standby, it mirrors primary; no need to run a separate backup of the same data. After you promote stm39.tvcdn.org to primary, run the same backup script on stm39.tvcdn.org and optionally copy backups to stm36.

Example: cron on primary (stm36) to backup and push to stm39.tvcdn.org:

```bash
# On stm36 – backup and copy to stm39.tvcdn.org (replace paths and user as needed)
0 */3 * * * sudo -u postgres /var/lib/postgresql/18/bin/pg_backup_rotated2.sh && rsync -az /var/lib/postgresql/18/backup/ user@stm39.tvcdn.org:/var/lib/postgresql/18/backup-from-stm36/
```

Use strong passwords and restrict `pg_hba.conf` and firewall to the two server IPs only.

### 8. Incremental backups (on primary)

Run these on **stm36** (primary). Enable WAL summarization once:

```bash
sudo -u postgres psql -c "ALTER SYSTEM SET summarize_wal = on;"
sudo -u postgres psql -c "SELECT pg_reload_conf();"
```

**Full backup**

```bash
sudo -u postgres mkdir -p /var/lib/postgresql/18/backup
sudo -u postgres pg_basebackup -D /var/lib/postgresql/18/backup
```

**Incremental backup** (after full backup exists)

```bash
sudo -u postgres mkdir -p /var/lib/postgresql/18/incremental_backup
sudo -u postgres pg_basebackup --incremental=/var/lib/postgresql/18/backup/backup_manifest -D /var/lib/postgresql/18/incremental_backup
```

**Later incremental backups** – chain from the previous incremental:

```bash
sudo -u postgres pg_basebackup --incremental=/var/lib/postgresql/18/incremental_backup/backup_manifest -D /var/lib/postgresql/18/incremental_backup_2
```

**Restore from full + incremental**

```bash
sudo -u postgres pg_combinebackup -o /path/to/restore_directory /var/lib/postgresql/18/backup/ /var/lib/postgresql/18/incremental_backup
```

### 9. Automated backup (project scripts)

**Copy scripts to primary (stm36)** – from your project root:

```bash
scp bin/pg_backup*.sh root@stm36.tvcdn.org:/var/lib/postgresql/18/bin/
```

**Ownership on the server**

```bash
ssh root@stm36.tvcdn.org 'chown -R postgres:postgres /var/lib/postgresql/18/bin/'
```

**Run manually (on stm36)**

```bash
sudo -u postgres /var/lib/postgresql/18/bin/pg_backup_rotated2.sh
```

**Cron on primary (stm36)** – every 3 hours:

```bash
crontab -e
```

Add:

```
0 */3 * * * sudo -u postgres /var/lib/postgresql/18/bin/pg_backup_rotated2.sh >> /var/log/postgresql/backup.log 2>&1
```

**Ship backups to stm39.tvcdn.org** (optional, if you use `pg_backup_ship.sh`):

```
0 */3 * * * /var/lib/postgresql/18/bin/pg_backup_ship.sh >> /var/log/postgresql/backup.log 2>&1
```

### 10. Continuous archiving and PITR

On both servers, ensure PostgreSQL can write to the data and archive directories:

```bash
sudo chown -R postgres:postgres /var/lib/postgresql/
sudo chmod -R 0750 /var/lib/postgresql/
```

Configure `archive_mode`, `archive_command`, and optionally `restore_command` in `postgresql.conf` on the primary (and standby if using PITR) per your strategy (see PostgreSQL docs for point-in-time recovery).

---

## Uninstall

If you need to remove PostgreSQL, see: [Uninstall PostgreSQL on Ubuntu](https://neon.tech/postgresql/postgresql-administration/uninstall-postgresql-ubuntu).

```bash
sudo apt-get --purge remove postgresql-18 postgresql-client-18

sudo rm -rf /var/lib/postgresql/ \ 
sudo rm -rf /var/log/postgresql/ \
sudo rm -rf /etc/postgresql/

#sudo deluser postgres
```

```bash
# re-add
sudo groupadd --system postgres
sudo useradd --system --shell /bin/bash --home /var/lib/postgresql --gid postgres postgres
```

---

## References

- [Setting up PostgreSQL 18 on Ubuntu 24.04](https://www.sqlpassion.at/archive/2024/10/14/comprehensive-guide-setting-up-postgresql-18-on-ubuntu-24-04/)
- [How to Install PostgreSQL on Ubuntu](https://docs.vultr.com/how-to-install-postgresql-on-ubuntu-24-04)
- [Use SSL encryption with PostgreSQL on Ubuntu](https://docs.vultr.com/use-ssl-encryption-with-postgresql-on-ubuntu-20-04)
- [Continuous archiving and point-in-time recovery (PostgreSQL)](https://www.digitalocean.com/community/tutorials/how-to-set-up-continuous-archiving-and-perform-point-in-time-recovery-with-postgresql-12-on-ubuntu-20-04)

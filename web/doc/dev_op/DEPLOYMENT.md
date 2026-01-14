# Deployment Note

Currently [riben.life](https://playground.riben.life) is hosted at [vercel](https://vercel.com).

As you commit to main branch, new code will deploy to the stage automatically.

Be sure to [maintain .env](https://vercel.com/mingsters-projects/legod/settings/environment-variables) manually should there be amy change.

## Production

production site [riben.life](https://riben.life) is hosted at mx2.mingster.com, which is on Ubuntu 22 with local postgres 18.

### deployment note

#### Change hostname if needed

```bash
sudo hostnamectl set-hostname riben.life
```

Verify the new setting:

```bash
sudo hostnamectl status
```

```bash
sudo nano /etc/hosts

localhost    localhost
127.0.1.1    riben.life
```

#### SSH

```bash
ssh-keygen -t ed25519

# also you need to setup authorized_keys
```

#### system update

```bash
sudo apt update && sudo apt upgrade -y
```

#### Essential Software

```bash
sudo apt install wget nano unzip ufw
```

#### postgres/psql (optional)

this is just so we can use psql client on the box.

```bash
# Import the repository signing key:
sudo apt install curl ca-certificates

sudo mkdir -p /usr/share/postgresql-common/pgdg
sudo install -d /usr/share/postgresql-common/pgdg
sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc

# Create the repository configuration file:
. /etc/os-release
sudo sh -c "echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $VERSION_CODENAME-pgdg main' > /etc/apt/sources.list.d/pgdg.list"

# Update the package lists:
sudo apt update

# install
sudo apt install postgresql-client-18
#sudo apt install postgresql-18
```

##### config db access

On the db box,

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

```text
# tc2
hostssl    all     all     59.126.30.241/32       scram-sha-256
```

```bash
sudo systemctl restart postgresql
```

##### check db access

back to the web site:

```bash
psql -h mx2.mingster.com -d riben_life -U pstv_user
```

#### Install Node.js and npm

For latest version, visit the Node.js official documentation page.

```bash
sudo apt install -y ca-certificates curl gnupg

curl -fsSL https://deb.nodesource.com/setup_24.x | sudo bash -
sudo apt-get install -y nodejs

# installs nvm (Node Version Manager)
#sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# download and install Node.js (you may need to restart the terminal)
#nvm install 24.12.0
# verifies the right Node.js version is in the environment
node -v # should print `v24.xxx`

# verifies the right npm version is in the environment
npm -v # should print `11.xxx`

# install bun
curl -fsSL https://bun.com/install | bash
```

#### git

```bash
sudo apt install git gh
```

```bash
gh auth login
```

#### lazygit

```bash
LAZYGIT_VERSION=$(curl -s "https://api.github.com/repos/jesseduffield/lazygit/releases/latest" | \grep -Po '"tag_name": *"v\K[^"]*')
curl -Lo lazygit.tar.gz "https://github.com/jesseduffield/lazygit/releases/download/v${LAZYGIT_VERSION}/lazygit_${LAZYGIT_VERSION}_Linux_x86_64.tar.gz"
tar xf lazygit.tar.gz lazygit
sudo install lazygit -D -t /usr/local/bin/
```

#### PM2

```bash
bun install -g pm2
```

#### ufw

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

sudo ufw enable
sudo ufw reload

sudo ufw status verbose
```

#### nginx

```bash
sudo apt install nginx -y

sudo nano /etc/nginx/sites-available/riben.life
```

Add the following configuration:

```bash
server {
    listen 80;
    server_name riben.life;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # Critical for OAuth callbacks and better-auth: pass proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # critical: avoid caching dynamic responses
        add_header Cache-Control "no-store" always;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for OAuth callbacks
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static build assets can be cached aggressively (safe)
    #location ^~ /_next/static/ {
    #    proxy_pass http://localhost:3001;
    #    add_header Cache-Control "public, max-age=31536000, immutable" always;
    #}

    # If you use next/image
    #location ^~ /_next/image/ {
    #    proxy_pass http://localhost:3001;
    #    add_header Cache-Control "public, max-age=60" always;
    #}
}
```

link to sites-enabled

```bash
sudo ln -s /etc/nginx/sites-available/riben.life /etc/nginx/sites-enabled/
```

test:

```bash
sudo nginx -t
```

If the test is successful, restart Nginx:

```bash
sudo systemctl restart nginx
```

#### SSL

```bash
sudo apt install certbot python3-certbot-nginx -y

sudo certbot --nginx -d riben.life
```

## configure

### clone the source

```bash
sudo mkdir -p /var/www
cd /var/www
sudo  git clone https://github.com/mingster/riben.life.git
```

### .env

copy or edit .env over to production

### file permission

```bash
# Replace 'youruser' with your actual username

sudo usermod -aG www-data youruser
sudo chown -R youruser:www-data /var/www

# Apply 755 to all directories
sudo find /var/www -type d -exec chmod 755 {} \;

# Apply 644 to all files
sudo find /var/www -type f -exec chmod 644 {} \;
```

### build

```bash
cd /var/www/riben.life/web/bin

sh deploy.sh

#bun install
#bun run build
```

### pm2

```bash

#mkdir -p /var/www/riben.life
cd /var/www/riben.life/web
#pm2 start bun --name "riben.life" -- start -- -p 3001

# 6. Restart PM2 (without the duplicate -p flag)
#pm2 delete riben.life
pm2 start bun --name "riben.life" -- start

pm2 startup systemd
pm2 save
pm2 status

# 7. Check the logs
pm2 logs riben.life --lines 50
```

## Cron jobs

1. Sendmail

Cron Script: `bin/run-sendmail-cron.sh`

Calls the API endpoint via curl

API Endpoint: `web/src/app/api/cron-jobs/sendmail/route.ts`

Handles GET requests

Calls sendMailsInQueue() action

Crontab Configuration:

* Runs every 15 minutes: `*/15 * * * *`
* Runs every 10 second:  `** * * * * sleep 10`

Actual Implementation:

The script calls: `curl https://riben.life/api/cron-jobs/sendmail`

The API route processes the email queue using sendMailsInQueue() from `@/actions/mail/send-mails-in-queue`

To set it up, add this to your crontab:

`** * * * * sleep 10 curl https://riben.life/api/cron-jobs/sendmail >> /var/www/riben.life/logs/sendmail.log 2>&1`

Or for Windows/Cygwin (as shown in DEPLOYMENT.md):

`** * * * * sleep 10; curl https://riben.life/api/cron-jobs/sendmail >> /var/www/riben.life/logs/sendmail.log 2>&1`

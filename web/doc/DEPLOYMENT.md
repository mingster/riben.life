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
sudo apt install wget ca-certificates curl nano unzip ufw
```

#### postgres/psql

```bash
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

sudo apt install postgresql postgresql-contrib
```

#### Install Node.js and npm

For latest version, visit the Node.js official documentation page.

```bash
# installs nvm (Node Version Manager)
sudo curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# download and install Node.js (you may need to restart the terminal)
nvm install 24
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

#### postgres

```bash
sudo apt install postgresql postgresql-contrib
```

#### PM2

```bash
bun install -g pm2

cd /var/www/riben.life/web

pm2 start bun --name "riben.life" -- start -- -p 3001


pm2 startup systemd
pm2 save

pm2 status
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
sudo mkdir /var/www
cd /var/www
sudo  git clone https://github.com/mingster/riben.life.git
```

### build

```bash
cd riben.life/web

nano .env

bun install
bun run build
```

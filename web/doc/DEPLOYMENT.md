# Deployment Note

Currently [riben.life](https://playground.riben.life) is hosted at [vercel](https://vercel.com).

As you commit to main branch, new code will deploy to the stage automatically.

Be sure to [maintain .env](https://vercel.com/mingsters-projects/legod/settings/environment-variables) manually should there be amy change.

## Production

production site [riben.life](https://riben.life) is hosted at mx2.mingster.com, which is on Ubuntu 22 with local postgres 18.

### deployment note

1. system update

``` bash
sudo apt update && sudo apt upgrade -y
```

1. Install Node.js and npm

For latest version, visit the Node.js official documentation page.

``` bash
# installs nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# download and install Node.js (you may need to restart the terminal)
nvm install 24
# verifies the right Node.js version is in the environment
node -v # should print `v24.xxx`

# verifies the right npm version is in the environment
npm -v # should print `11.xxx`

# install bun
apt install unzip

curl -fsSL https://bun.com/install | bash
```

1. git

``` bash
apt install git gh
```

``` bash
git auth login
```

1. clone the source

``` bash
cd /var/www
git clone https://github.com/mingster/riben.life.git
```

1. build

``` bash
cd riben.life/web

nano .env

bun install
bun run build
```

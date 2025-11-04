# Dev Setup & Coding Note

## Basic Operation

- Install packages

    ``` shell
    bun install
    ```

- Run dev server (with node.js)

    ``` shell
    bun dev
    ```

- Build

    ``` shell
    bun run build
    ```

- Linter

    ``` shell
    bun run biolint

    #bunx biome lint --write ./src
    ```

- Prettier

    ``` shell
    bun run pretty
    ```

- Build

    ``` shell
    bun run build
    ```

You MUST lint, pretty, and ensure successful build before commit the branch.

## Dev Environment setup

follow this guide to set up development environment from sketch:

### bun, package manager

``` shell
curl -fsSL https://bun.sh/install | bash
```

### node, the run-time

``` shell
asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git

asdf nodejs update-nodebuild

asdf install nodejs 20.18.0
asdf global nodejs 20.18.0
asdf shell nodejs 20.18.0

npm install -g npm@latest
corepack disable
asdf reshim nodejs
```

### [vscode](https://github.com/mingster/dotfiles/blob/master/vscode/vscode_README.md), the IDE

``` shell
brew install --cask visual-studio-code

curl -s https://raw.githubusercontent.com/mingster/dotfiles/master/vscode/install-vscode-extensions.sh | /bin/bash
```

### [postgres](https://github.com/mingster/dotfiles/blob/master/mac/install_PostgreSQL.sh), the main database

``` shell
brew install postgresql@17

createuser -s postgres
```

In the psql session, type \password postgres to set the password.

``` shell
psql -h localhost -U postgres
```

CREATE NEW user

in the psql sessesion, create new user as follow:

``` shell
CREATE ROLE PSTV_USER WITH LOGIN PASSWORD 'Sup3rS3cret';
```

you can \du to list out users.

allow PSTV_USER user to create db:

``` shell
ALTER ROLE PSTV_USER CREATEDB;
```

\q to quit psql

reconnect using the new user

``` shell
psql postgres -U pstv_user;
```

Create new database and its permission:

``` shell
CREATE DATABASE pstvweb;
GRANT ALL PRIVILEGES ON DATABASE pstvweb TO pstv_user;
\list
\connect pstvweb
\dt
\q
```

You can now create, read, update and delete data on our database with the user pstv_user!

#### Generate prisma object and db schema

```shell
npx prisma generate
npx prisma db push
```

#### Generate view(s)

``` shell
psql pstv_web -U pstv_user
```

The view sql files are under $pstv_web/prisma/views. Execute each of the files.

you can also do manual sql execution something like this:

``` shell
update "Product" set "useOption"=true;
```

optioanl gui tool

``` shell
brew install --cask --appdir="/Applications/_dev" pgadmin4
```

### [monogo db](https://github.com/mingster/dotfiles/blob/master/mac/install_mongodb.sh), the metabase

``` shell
brew install --cask --appdir="/Applications/_dev" mongodb-compass

brew tap mongodb/brew
brew update

brew install mongodb-community@7.0
```

add relication to /usr/local/etc/mongod.conf

``` shell
architecture=$(uname -m)
if [ "$architecture" == "arm64" ]; then

  echo "replication:" >> /opt/homebrew/etc/mongod.conf
  echo "    replSetName: rs0" >> /opt/homebrew/etc/mongod.conf

elif [ "$architecture" == "x86_64" ]; then

  echo "replication:" >> /usr/local/etc/mongod.conf
  echo "    replSetName: rs0" >> /usr/local/etc/mongod.conf

else
    echo "Unknown architecture: $architecture"
fi

```

start the database service:

``` shell
brew services start mongodb-community
```

### clone and install

 ``` shell
 git clone https://github.com/mingster/riben.life.git
 cd riben.life/web
 bun
 ```

### Populate default data

start admin site and visit: [http://localhost:3000/install](http://localhost:3000/install) to populate default data.

## .env

 ``` javascript

# Non-NEXT_PUBLIC_ environment variables are only available in the Node.js environment, meaning they
#aren't accessible to the browser (the client runs in a different environment).

# allow URLs to access API (bypass CORS)
FRONTEND_URLS=

NEXT_PUBLIC_API_URL=http://localhost:3000/api


# follow this guide: https://www.prisma.io/dataguide/mysql/setting-up-a-local-mysql-database#setting-up-mysql-on-macos
MONGODB_URI=
POSTGRES_PRISMA_URL=

# auth.js
AUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000/

AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

AUTH_APPLE_ID=
AUTH_APPLE_SECRET=

AUTH_LINE_ID=
AUTH_LINE_SECRET=

AUTH_DISCORD_ID=
AUTH_DISCORD_SECRET=

AUTH_FACEBOOK_ID=
AUTH_FACEBOOK_SECRET=


# Nodemailer
EMAIL_SERVER_USER=
EMAIL_SERVER_PASSWORD=
EMAIL_SERVER_HOST=email-smtp.us-west-2.amazonaws.com
EMAIL_SERVER_PORT=587
EMAIL_FROM=

#stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YhBvTbawMEIM4M1ehtZkwMk8
STRIPE_SECRET_KEY_LIVE=
STRIPE_SECRET_KEY=sk_test_Q1FFJn1kip6u5vuOjZBKGF8F
STRIPE_WEBHOOK_SECRET=

# google reCAPTCHA for contact us form
# https://www.google.com/recaptcha/admin/create
NEXT_PUBLIC_RECAPTCHA=6Lc8xE8qAAAAAEZyL1dBXzyKBaP-kuUjMObACn_l
RECAPTCHA_SECRET=6Lc8xE8qAAAAAIIbEkXmNHiy8er4y_-aDDwwsVIG

#paypal

#paypal sandbox
NEXT_PUBLIC_PAYPAL_CLIENT_ID=Adyuk9hLvzp_QcUVxMHzcOe-JFTHp43mGLbvGIF0tJEFmxm3Pfgaj85vn1wMShd_CRa2LPjvP0liN6MQ
PAYPAL_CLIENT_SECRET=EAQojhOe7ksKgMwJtHXcDRapAh0XhDFlz4aT-60Syp7sd7TvQDAIn473ASjjLzZVx4okIEgF_pOD8x_2
PAYPAL_CLIENT_ID=Adyuk9hLvzp_QcUVxMHzcOe-JFTHp43mGLbvGIF0tJEFmxm3Pfgaj85vn1wMShd_CRa2LPjvP0liN6MQ

#NODE_ENV=production
NODE_ENV=development

#pino log level
LOG_LEVEL=error

# cloudinary project id
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET=
NEXT_PUBLIC_CLOUDINARY_APIKEY=
NEXT_PUBLIC_CLOUDINARY_APISECRET=

 ```

## External Services

### shad/cn

``` shell
bunx --bun shadcn@latest add button
```

### [Cloudary](https://cloudinary.com)

sign up to Cloudinary. This will be online file storage provider

 edit ```.env``` to set up the following:

 ``` ts
 NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
 NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET=
 NEXT_PUBLIC_CLOUDINARY_APIKEY=
 NEXT_PUBLIC_CLOUDINARY_APISECRET=
 ```

 Update ```uploadPreset``` parameter in ```@/components/ui/image-upload.tsx```

## NextAuth

edit ``` /lib/authOptions.ts ``` to set up the providers.

## Coding Note

### How to compress assets and turn them into .tsx components

[gltfjsx](https://github.com/pmndrs/gltfjsx)

1. `npx gltf-pipeline -i model.gltf -o model.glb --draco.compressionLevel=10`
2. `npx gltfjsx model.gltf --types`

``` shell
npx gltf-pipeline -i bigCross.gltf -o bigCross_compressed.gltf --draco.compressionLevel=10
npx gltfjsx bigCross_compressed.gltf --types --keepgroups --meta --precision 10
```

### manage packages

``` shell
bun update
#yarn upgrade --pattern prisma --latest
```

## toaster variant

add to toastVariants

``` ts
success: "success group border-green-500 bg-green-500 text-neutral-50",
```

## Resources

- [shadcn/ui](https://ui.shadcn.com/docs/components/toast)
- [tailwindcss](https://tailwindcss.com)
- [NEXT.js](https://nextjs.org/docs)
- [Prisma](https://www.prisma.io/docs/orm/prisma-client/)
- [auth.js](https://authjs.dev/reference/overview)

### lazygit cheat sheet

#### Creating a New Branch

First, make sure that the upstream-master branch is in sync with the remote. Use ```h``` and ```l``` to switch to the Local branches section, then use ```k``` and ```j``` to navigate to the upstream-master branch.

Next, press ```f``` to fetch the latest changes. Finally, press ```n``` to create a new branch.

#### Syncing with Upstream

Again, navigate to the upstream-master branch in the Local branches section, then press ```f``` to fetch the latest changes and ```r``` to rebase onto it.

#### Development and Pull Request

Navigate to the Files section and press ```Space``` to add files to the staging area one by one, or use ```a``` to add all files at once. Then, press ```C``` to commit.

Next, navigate to the branch you want to push in the Local branches section and press ```P``` to push. Finally, press ```o``` to open the GitHub pull request page.

#### Global

- h and l: Switch between the sections on the left side.
- k and j: Move the cursor up and down.
- /: Search for a string.
- [ and ]: Switch between the tabs on the left side.
- Ctrl + o: Copy the file name (in the Files section), branch name (in the Local branches section), or commit hash (in the commits section) to the clipboard.
- q: Exit Lazygit.

#### Left Side - Files Section

- Space: Add or remove the selected file from the staging area.
- a: Add or remove all files from the staging area.
- Enter: Collapse or expand folders when used on a folder, or enter the file preview area on the right side when used on a file.
- C: Open an external text editor to edit the commit message, then commit.
- A: Amend the last commit.
- d: Discard all changes to the selected file that have not been committed. Note that if the file is newly created, it will be deleted.
- D: Discard all changes to all files that have not been committed. Use this when you’ve messed up and want to start over.
- S: Open the stash options.

#### Left Side - Local Branches Section

- Space: Switch to the selected branch.
- n: Checkout a new branch from the selected branch.
- f: Fetch new commits for the selected branch from the remote.
- r: Rebase onto the selected branch.
- R: Rename the selected branch.
- p: Pull the selected branch.
- P: Push the selected branch.
- o: Open the GitHub pull request page for the selected branch.
- Enter: View the commits of the selected branch. Use Esc to go back.

#### Left Side - Commits Section

- Enter: View the files changed in the selected commit. Use Esc to go back.
- R: Open an external editor to modify the commit message.
- d: Delete the selected commit.
- g: Open the reset options.
- F: Create a fixup! commit for the selected commit.
- S: Squash all fixup! commits on top of the selected commit.

#### Left Side - Stash Section

- g: Apply and delete the selected stash.
- Space: Apply the selected stash without deleting it.
- d: Delete the selected stash.

#### Right Side - Preview Area

- v: Enter multi-line selection mode.
- Space: Add or remove the selected line or lines (when in multi-line selection mode) from the staging area.
- Esc: Return to the left side sections.

## [Obsoleted - MySQL]

- [Setting up a local MySQL database](https://www.prisma.io/dataguide/mysql/setting-up-a-local-mysql-database#setting-up-mysql-on-macos)

- [How to manage users and authentication in MySQL](https://www.prisma.io/dataguide/mysql/authentication-and-authorization/user-management-and-authentication)

  ``` bash
  mysql -u root -p

  SHOW VARIABLES LIKE 'validate_password%';
  SET GLOBAL validate_password.policy= 'LOW';

  SHOW VARIABLES LIKE '%authentication_plugin%';
  SET GLOBAL default_authentication_plugin= 'mysql_native_password';


  SHOW STATUS LIKE '%authentication_plugin%';

  create database pstvweb;
  create user 'localdev'@'localhost' identified WITH mysql_native_password by 'psTv_web4dev!!';
  grant all on pstvweb.* to 'localdev'@'localhost';


  ALTER USER 'localdev'@'localhost' IDENTIFIED WITH mysql_native_password BY 'psTv_web4dev!!';
  #ALTER USER 'dev'@'localhost' IDENTIFIED WITH mysql_native_password BY 'dev4fun!';

  exit

  # https://www.digitalocean.com/community/tutorials/how-to-create-a-new-user-and-grant-permissions-in-mysql

  # change password
  ALTER USER 'localdev'@'localhost' IDENTIFIED WITH mysql_native_password BY 'psTv_web4dev!!';

  GRANT all ON pstvweb.* TO 'localdev'@'localhost';

  SHOW GRANTS FOR 'localdev'@'localhost';

  FLUSH PRIVILEGES;

  # test the new user
  mysql -u localdev -p
  ```

- get the connection string and add it to ```.env```

  ```ts
  DATABASE_URL=mysql://localdev:psTv_web4dev!!@localhost:3306/pstvweb?
  ```

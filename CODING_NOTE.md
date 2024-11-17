# Dev Setup & Coding Note

this project typescript + bun + next.js + postgres with a bit of monogodb.  Follow the quick note below to set up dev enviornment.

## Dev Environment

- bun, package manager:

	``` fish
	curl -fsSL https://bun.sh/install | bash
	```

- node, the run-time:

	``` fish
	asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git
	
	asdf nodejs update-nodebuild
		
	asdf install nodejs 20.18.0
	asdf global nodejs 20.18.0
	asdf shell nodejs 20.18.0
	
	npm install -g npm@latest
	corepack disable		
	asdf reshim nodejs
	```

- [vscode](https://github.com/mingster/dotfiles/blob/master/vscode/vscode_README.md), the IDE:

	``` fish
	brew install --cask visual-studio-code
	
	curl -s https://raw.githubusercontent.com/mingster/dotfiles/master/vscode/install-vscode-extensions.sh | /bin/bash
	```

- [postgres](https://github.com/mingster/dotfiles/blob/master/mac/install_PostgreSQL.sh)

	``` fish
	brew install postgresql@15
	
	createuser -s postgres
	```
	
	In the psql session, type \password postgres to set the password.	
	
	``` fish
	psql -h localhost -U postgres
	```
	
	CREATE NEW user
	
	in the psql sessesion, create new user as follow:
	
	``` fish
	CREATE ROLE PSTV_USER WITH LOGIN PASSWORD 'Sup3rS3cret';
	```
	
	you can \du to list out users.
	
	allow PSTV_USER user to create db:


	``` fish
	ALTER ROLE PSTV_USER CREATEDB;
	```
	
	\q to quit psql
	
	reconnect using the new user
	
	``` fish
	psql postgres -U pstv_user;
	```
	
	Create new database and its permission:

	``` fish
	CREATE DATABASE pstvweb;
	GRANT ALL PRIVILEGES ON DATABASE pstvweb TO pstv_user;
	\list
	\connect pstvweb
	\dt
	\q
	```
	
	You can now create, read, update and delete data on our
	pstv_web database with the user pstv_user!

	
	optioanl gui tool
	
	``` fish
	brew install --cask --appdir="/Applications/_dev" pgadmin4
	```
	
- [monogo db](https://github.com/mingster/dotfiles/blob/master/mac/install_mongodb.sh)

	``` fish
	brew install --cask --appdir="/Applications/_dev" mongodb-compass
	
	brew tap mongodb/brew
	brew update
	
	brew install mongodb-community@7.0
	```
	
	add relication to /usr/local/etc/mongod.conf
	
	``` fish
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
	
	``` fish
	brew services start mongodb-community
	```

## .env

``` javascript

# Non-NEXT_PUBLIC_ environment variables are only available in the Node.js environment, meaning they aren't accessible to the browser
#(the client runs in a different environment).

# allow URLs to access API (bypass CORS)
# this will made api availablity in the browser (not block by cors)
FRONTEND_URLS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# local dev
MONGODB_URI=mongodb://127.0.0.1:27017/pstvweb?directConnection=true&serverSelectionTimeoutMS=2000

# local dev
POSTGRES_PRISMA_URL=postgres://pstv_user:Sup3rS3cret@localhost:5432/pstv_web?schema=public

# auth.js
AUTH_SECRET=NL6UuMAgQmm88Cp3YcABNRzbVfsPAEA6r7/9YYsicIU=
AUTH_URL=http://localhost:3000/

# https://console.cloud.google.com/apis/credentials?organizationId=0&project=pstv-web
#AUTH_GOOGLE_ID=279341871957-bnbrm2ugtnbrs3knske9mmudv95n3ech.apps.googleusercontent.com
#AUTH_GOOGLE_SECRET=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

AUTH_GOOGLE_ID=36442206804-gc4cogfifjdhj6v6vj9htb4hmb7jouqd.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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

AUTH_APPLE_ID=
AUTH_APPLE_SECRET=

# https://developers.line.biz/console/channel/1660702416/basics
AUTH_LINE_ID=1660702416
AUTH_LINE_SECRET=1eb7448795a4b7829f94395996d07dbc

# https://discord.com/developers/applications/1287781517506121739/information
AUTH_DISCORD_ID=1287781517506121739
AUTH_DISCORD_SECRET=D_nw-IhhTSSnR-yh3Y6tHnWNldQJsz-X

# https://developers.facebook.com/apps/557644063270057/settings/basic/
AUTH_FACEBOOK_ID=557644063270057
AUTH_FACEBOOK_SECRET=c1cc160d58ca71b26e5f5c21cfb63e12

#AUTH_RESEND_KEY=re_eFVae2kf_MbyF7wmKJDekCnenrkvNCk4h
#EMAIL_SERVER=smtp://AKIAYBQBDDJ2BZLMRVWC:BL72janQ7lGbmczeo2A9BAKSKhdQgNG71zNC6N5CzcVt@email-smtp.us-west-2.amazonaws.com:587
EMAIL_SERVER_USER=AKIAYBQBDDJ2BZLMRVWC
EMAIL_SERVER_PASSWORD=BL72janQ7lGbmczeo2A9BAKSKhdQgNG71zNC6N5CzcVt
EMAIL_SERVER_HOST=email-smtp.us-west-2.amazonaws.com
EMAIL_SERVER_PORT=587
EMAIL_FROM=support@riben.life

# google reCAPTCHA for contact us form
# https://www.google.com/recaptcha/admin/create
NEXT_PUBLIC_RECAPTCHA=6Lc8xE8qAAAAAEZyL1dBXzyKBaP-kuUjMObACn_l
RECAPTCHA_SECRET=6Lc8xE8qAAAAAIIbEkXmNHiy8er4y_-aDDwwsVIG

#stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51Q6RpqRqaK2IhyxPdczGCSbNRLf87nii3qWSu4JE9xdvY25mmn9vZqFV0OvdHDrwtSK6yajirPKysAXfObgiODur00lHEI8SoE
STRIPE_SECRET_KEY_LIVE=
STRIPE_SECRET_KEY=sk_test_51Q6RpqRqaK2IhyxP8ofzv48mqvqE9Y6Tan8AJNVoNsG6o0DJqnO7WocN81phJYtTNpXqVPzPtNtYV6njtQtZbxLd00Zl8ZYCgs
STRIPE_WEBHOOK_SECRET=

# Line pay
# sandbox ID : test_202410255680@line.pay PW : 4m4if.E8jm
LNE_PAY_ID=2006498972
LINE_PAY_SECRET=8c61aae43b159006ad716239dc3afffd
#LINE_PAY_API_URL=https://sandbox-api-pay.line.me

#Sandbox server (for tests): sandbox-api-pay.line.me
#Production server (for actual service): api-pay.line.me

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
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dmrkerzmj
NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET=iatdoixp
NEXT_PUBLIC_CLOUDINARY_APIKEY=495445396721554
NEXT_PUBLIC_CLOUDINARY_APISECRET=JaRrBfUN5X_Vl5tIT0iKAKtQ6QA
```

## Basic Operation

- Install packages

	``` fish
	bun install
	```

- Run dev server (with node.js)

	``` fish
	bun dev
	```

- Build

	``` fish
	bun run build
	```

- Linter

	``` fish
	bun run biolint
	
	#bunx biome lint --write ./src
	```

- Prettier

	``` fish
	bun run biome	
	```


## Sign up for the services below

- [Cloudary](https://cloudinary.com)

1. clone and install

	``` fish
	git clone https://github.com/mingster/riben.life.git
	
	cd riben.life/web
	yarn
	```

1. Setup Prisma / Database

	Postgres
	
	- Generate prisma object and db schema
	
	```shell
	npx prisma generate
	npx prisma db push
	```
	
	- Generate view(s)
	
	```
	psql pstv_web -U pstv_user
	```
	
	The view sql files are under $pstv_web/prisma/views. Execute each of the files.
	
	you can also do manual sql execution something like this: 
	```
	update "Product" set "useOption"=true;
	```

1. Cloudinary

	- sign up to Cloudinary. This will be online file storage provider
	
	edit ```.env``` to set up the following:
	
	```ts
	NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
	NEXT_PUBLIC_CLOUDINARY_UNSIGNED_UPLOAD_PRESET=
	NEXT_PUBLIC_CLOUDINARY_APIKEY=
	NEXT_PUBLIC_CLOUDINARY_APISECRET=
	```
	
	Update ```uploadPreset``` parameter in ```@/components/ui/image-upload.tsx```

## NextAuth

edit ``` /lib/authOptions.ts ``` to set up the providers.

## Populate default data

start admin site and visit: [http://localhost:3000/install](http://localhost:3000/install).  Click each button to populate default data.

## Coding Note

### How to compress assets and turn them into .tsx components

[gltfjsx](https://github.com/pmndrs/gltfjsx)

1. `npx gltf-pipeline -i model.gltf -o model.glb --draco.compressionLevel=10`
2. `npx gltfjsx model.gltf --types`

```shell
npx gltf-pipeline -i bigCross.gltf -o bigCross_compressed.gltf --draco.compressionLevel=10
npx gltfjsx bigCross_compressed.gltf --types --keepgroups --meta --precision 10
```

### manage packages

``` fish
yarn upgrade --pattern prisma --latest
```

### Linting (Eslint)

``` fish
yarn add biome --dev
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


### lazygit cheatsheet

#### Creating a New Branch

First, make sure that the upstream-master branch is in sync with the remote. Use <code>h</code> and <code>l</code> to switch to the Local branches section, then use <code>k</code> and <code>j</code> to navigate to the upstream-master branch. 

Next, press <code>f</code> to fetch the latest changes. Finally, press <code>n</code> to create a new branch.

#### Syncing with Upstream

Again, navigate to the upstream-master branch in the Local branches section, then press <code>f</code> to fetch the latest changes and <code>r</code> to rebase onto it.

#### Development and Pull Request

Navigate to the Files section and press <code>Space</code> to add files to the staging area one by one, or use <code>a</code> to add all files at once. Then, press <code>C</code> to commit. 

Next, navigate to the branch you want to push in the Local branches section and press <code>P</code> to push. Finally, press <code>o</code> to open the GitHub pull request page.

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




##  [Obsoleted - MySQL]
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


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
	
	asdf list all nodejs
	
	asdf nodejs resolve lts --latest-available
	
	asdf install nodejs 20.18.0
	asdf global nodejs 20.18.0
	asdf shell nodejs 20.18.0
	
	npm install -g npm@latest
	
	corepack disable
		
	asdf reshim nodejs
	```

- [vscode](https://github.com/mingster/dotfiles/blob/master/vscode/vscode_README.md), the IDE:


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


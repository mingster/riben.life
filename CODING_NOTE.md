# Dev Setup & Coding Note

## Dev Environment

- [node.js / yarn / ...](https://github.com/mingster/dotfiles/blob/433ddf40a11b3ef2fb2b45721206376e24574d0b/install/web.sh)

- vs code and its [JS profile](https://vscode.dev/profile/github/7ddbc3501bada54a92352aca7dde0b5e)

``` fish
brew install --cask --appdir="/Applications/_dev" visual-studio-code
```

## Sign up for the services below

- [tiDB](https://tidbcloud.com/)
- [Cloudary](https://cloudinary.com)
- <s>[Planet scale](https://app.planetscale.com/)</s>

1. clone and install

``` fish
git clone https://github.com/mingster/popnmom.shop.git
cd popnmom.shop
yarn install
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


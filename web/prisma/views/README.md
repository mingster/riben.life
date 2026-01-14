# how to execute view.sql

## Postgres

1. login

  local

  ``` bash
  psql pstv_web -U pstv_user
  ```

  ``` bash
  psql -h miniu -d riben_life -U pstv_user

#or
  psql -h mx2.mingster.com -d riben_life -U pstv_user
  ```

1. copy & paste in the sql statement
1. \q to quit.

### execute sql

``` sql
CREATE OR REPLACE view OrderItemView as
SELECT item.id,
    item."orderId",
    item."productId",
    item.quantity,
    item."unitDiscount",
    item."unitPrice",
    item."productName" AS name,
    (
        SELECT pi.url
        FROM "ProductImages" pi
        WHERE pi."productId" = item."productId"
        LIMIT 1
    ) AS url,
    item."variants",
    item."variantCosts"
FROM "OrderItem" item;

/*
CREATE OR REPLACE view OrderItemView as
SELECT item.id,
    item."orderId",
    item."productId",
    item.quantity,
    item."unitDiscount",
    item."unitPrice",
    (
        SELECT p.name
        FROM "Product" p
        WHERE p.id = item."productId"
    ) AS name,
    (
        SELECT pi.url
        FROM "ProductImages" pi
        WHERE pi."productId" = item."productId"
        LIMIT 1
    ) AS url,
    item."variants",
    item."variantCosts"
FROM "OrderItem" item;
*/

```

``` sql
delete from "SubscriptionPayment";
```

## Reset schema

To effectively "drop all tables" using Prisma and then apply a fresh migration, especially during development, the following steps are recommended:
Delete the migrations folder: This removes all existing migration files, signifying a complete reset of your migration history.

``` bash
rm -rf prisma/migrations
```

Reset the database: This command drops all tables in your database and applies any existing migrations (which will be none after step 1). The --force flag is used to bypass confirmation prompts. The --skip-seed flag is useful if you have seed data that you don't want to run during the reset.

``` bash
npx prisma migrate reset --force --skip-seed
```

Generate a new initial migration: This command creates a new migration file based on the current state of your schema.prisma file, effectively creating all the tables defined in your schema from scratch.

``` bash
npx prisma migrate dev --name init
```

The --name init flag provides a descriptive name for this initial migration.
After these steps, your database will have all previous tables dropped, and a fresh set of tables will be created according to your current Prisma schema. This process is particularly useful in early development stages when frequent schema changes and database resets are common.

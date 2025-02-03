# how to execute view.sql

## Postgres

1. login

  local

  ``` bash
  psql pstv_web -U pstv_user
  ```

  ``` bash
  psql -h mx2.mingster.com -d pstv_web -U pstv_user
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

```

``` sql
delete from "SubscriptionPayment";
```

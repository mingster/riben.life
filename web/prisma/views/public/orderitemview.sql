SELECT
  id,
  "orderId",
  "productId",
  quantity,
  "unitDiscount",
  "unitPrice",
  "productName" AS name,
  (
    SELECT
      pi.url
    FROM
      "ProductImages" pi
    WHERE
      (pi."productId" = item."productId")
    LIMIT
      1
  ) AS url,
  variants,
  "variantCosts"
FROM
  "OrderItem" item;
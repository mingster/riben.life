import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Product } from "@prisma/client";

const getStoreProducts = async (storeId: string): Promise<Product[]> => {
  if (!storeId) {
    throw Error("orderId is required");
  }

  const obj = await sqlClient.product.findMany({
    where: {
      storeId: storeId,
    },
    /*
		select: {
		  isPaid: true,
		  orderTotal: true,
		  shippingMethod: true,
		  paymentMethod: true,
		},
		*/
    include: {
      //user: true,
      //shippingMethod: true,
      //paymentMethod: true,
      ProductAttribute: true,
    },
  });
  transformDecimalsToNumbers(obj);

  return obj;
};

export default getStoreProducts;

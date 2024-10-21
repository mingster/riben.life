import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreWithProducts } from "@/types";

const getStoreWithProducts = async (
  storeId: string,
): Promise<StoreWithProducts> => {
  if (!storeId) {
    throw Error("storeId is required");
  }

  const store = await sqlClient.store.findFirst({
    where: {
      id: storeId,
    },
    include: {
      StoreShippingMethods: {
        include: {
          ShippingMethod: true,
        },
      },
      StorePaymentMethods: {
        include: {
          PaymentMethod: true,
        },
      },
      Categories: {
        where: { isFeatured: true },
        orderBy: { sortOrder: "asc" },
        include: {
          ProductCategories: {
            //where: { Product: { status: ProductStatus.Published } },
            include: {
              Product: {
                //where: { status: ProductStatus.Published },
                include: {
                  ProductImages: true,
                  ProductAttribute: true,
                  //ProductCategories: true,
                  ProductOptions: {
                    include: {
                      ProductOptionSelections: true,
                    },
                    orderBy: {
                      sortOrder: "asc",
                    },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!store) {
    throw Error("no store found");
  }

  transformDecimalsToNumbers(store);

  return store;
};

export default getStoreWithProducts;

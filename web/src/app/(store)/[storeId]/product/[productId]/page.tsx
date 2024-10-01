import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Product } from "@/types";
import { redirect } from "next/navigation";
import { ProductCard } from "../../components/product-card";

const StoreProductPage = async ({
  params,
}: { params: { productId: string; storeId: string } }) => {
  const store = await sqlClient.store.findFirst({
    where: {
      id: params.storeId,
    },
    include: {
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
        //StoreAnnouncement: true,
      },
    },
  });

  if (!store) {
    redirect("/unv");
  }

  transformDecimalsToNumbers(store);

  const product = (await sqlClient.product.findUnique({
    where: {
      id: params.productId,
    },
    include: {
      ProductImages: true,
      ProductAttribute: true,
      ProductOptions: {
        include: {
          ProductOptionSelections: true,
        },
      },
      ProductCategories: true,
    },
  })) as Product;
  transformDecimalsToNumbers(product);

  //console.log(`StoreProductPage: ${JSON.stringify(product)}`);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        {product && (
          <ProductCard
            className=""
            disableBuyButton={!store.isOpen}
            product={product}
          />
        )}
      </div>
    </div>
  );
};

export default StoreProductPage;

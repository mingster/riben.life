import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Product, StoreWithProducts } from "@/types";
import { redirect } from "next/navigation";
import { ProductCard } from "../../components/product-card";
import getStoreWithProducts from "@/actions/get-store-with-products";
import { Client } from "./client";

const StoreProductPage = async ({
  params,
}: { params: { productId: string; storeId: string } }) => {
  const store = (await getStoreWithProducts(
    params.storeId,
  )) as StoreWithProducts;

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
        <Client product={product} store={store} />
      </div>
    </div>
  );
};

export default StoreProductPage;

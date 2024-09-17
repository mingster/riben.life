import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Product, StoreProductOptionTemplate } from "@/types";

const StoreProductPage = async ({
  params,
}: { params: { productId: string; storeId: string } }) => {
  const product = (await sqlClient.product.findUnique({
    where: {
      id: params.productId,
    },
    include: {
      ProductImages: true,
      ProductAttribute: true,
      ProductCategories: true,
      ProductOptions: {
        include: {
          ProductOptionSelections: true,
        },
      },
    },
  })) as Product | null;

  transformDecimalsToNumbers(product);
  console.log(`StoreProductPage: ${JSON.stringify(product)}`);

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">PRODUCT</div>
    </div>
  );
};

export default StoreProductPage;

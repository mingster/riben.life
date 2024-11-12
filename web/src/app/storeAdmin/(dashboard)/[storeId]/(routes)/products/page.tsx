import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import type { Product } from "@/types";
import type { Store } from "@prisma/client";
import { format } from "date-fns";
import { Suspense } from "react";
import type { ProductColumn } from "./components/columns";
import { ProductsClient } from "./components/products-client";
import { transformDecimalsToNumbers } from "@/lib/utils";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ProductsPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const products = (await sqlClient.product.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      ProductImages: true,
      ProductAttribute: true,
      ProductCategories: true,
      ProductOptions: {
        include: {
          ProductOptionSelections: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  })) as Product[];
  transformDecimalsToNumbers(products);

  //console.log(`products: ${JSON.stringify(products)}`);
  /*
	//products[0].price= decimal(12.95);
	products[0].isFeatured = true;
	products[0].isRecurring = true;
	products[0].status = 20;
	*/

  // map product to ui
  const formattedProducts: ProductColumn[] = products.map((item: Product) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    price: Number(item.price),
    isFeatured: item.isFeatured,
    updatedAt: format(item.updatedAt, "yyyy-MM-dd"),
    stock: item.ProductAttribute?.stock || 0,
    isRecurring: item.ProductAttribute?.isRecurring,
    hasOptions: item.ProductOptions?.length > 0,
    //category: item.category.name,
    //size: item.size.name,
    //color: item.c.color.value,
  }));

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <ProductsClient data={formattedProducts} />
      </Container>
    </Suspense>
  );
}

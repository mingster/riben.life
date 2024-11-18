import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import type { Category, Store } from "@/types";
import { Suspense } from "react";
import { CategoryClient } from "./components/category-client";
import type { CategoryColumn } from "./components/columns";

type Params = Promise<{ storeId: string; messageId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CategoryPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const lastSort = await sqlClient.category.findFirst({
    where: { storeId: params.storeId },
    orderBy: { sortOrder: "desc" },
  });
  //console.log(JSON.stringify(lastSort?.sortOrder));

  const categories = await sqlClient.category.findMany({
    where: {
      storeId: store.id,
    },
    include: {
      ProductCategories: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
  });

  // map FAQ Category to ui
  const formattedCategories: CategoryColumn[] = categories.map(
    (item: Category) => ({
      categoryId: item.id.toString(),
      storeId: store.id.toString(),
      name: item.name.toString(),
      isFeatured: item.isFeatured,
      sortOrder: Number(item.sortOrder) || 0,
      numOfProducts: item.ProductCategories.length,
    }),
  );

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <CategoryClient data={formattedCategories} />
      </Container>
    </Suspense>
  );
}

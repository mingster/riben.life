import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { Suspense } from "react";
import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import type { Category, Store } from "@/types";
import type { CategoryColumn } from "./components/columns";
import { CategoryClient } from "./components/category-client";

//import { Metadata } from 'next';
interface pageProps {
  params: {
    storeId: string;
  };
}

// here we save store settings to mangodb
//
const CategoryPage: React.FC<pageProps> = async ({ params }) => {
  const store = (await checkStoreAccess(params.storeId)) as Store;

  const lastSort = await sqlClient.category.findFirst({
    where: { storeId: params.storeId },
    orderBy: { sortOrder: "desc" },
  });
  console.log(JSON.stringify(lastSort?.sortOrder));

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
};

export default CategoryPage;

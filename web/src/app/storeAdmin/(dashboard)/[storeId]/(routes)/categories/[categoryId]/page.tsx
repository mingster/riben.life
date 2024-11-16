import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { CategoryEditTabs } from "./tabs";

type Params = Promise<{ storeId: string; categoryId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CategoryEditPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;
  const obj = await sqlClient.category.findUnique({
    where: {
      id: params.categoryId,
    },
    include: {
      ProductCategories: true,
    },
  });
  //console.log(`CategoryEditPage: ${JSON.stringify(obj)}`);

  const allProducts = await sqlClient.product.findMany({
    where: {
      storeId: params.storeId,
    },
    orderBy: {
      name: "asc",
    },
  });

  transformDecimalsToNumbers(allProducts);

  let action = "Edit";
  if (obj === null) action = "Create";

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <CategoryEditTabs
          initialData={obj}
          allProducts={allProducts}
          action={action}
        />
      </div>
    </div>
  );
}

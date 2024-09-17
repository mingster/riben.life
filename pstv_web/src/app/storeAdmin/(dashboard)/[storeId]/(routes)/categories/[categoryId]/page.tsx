import { sqlClient } from "@/lib/prismadb";
import { CategoryEditTabs } from "./tabs";
import { transformDecimalsToNumbers } from "@/lib/utils";

const CategoryEditPage = async ({
  params,
}: { params: { storeId: string; categoryId: string } }) => {
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
};

export default CategoryEditPage;

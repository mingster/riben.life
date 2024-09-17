import { sqlClient } from "@/lib/prismadb";
import { FaqCategoryEdit } from "./faqCategory-edit";

const FaqCategoryEditPage = async ({
  params,
}: { params: { storeId: string; categoryId: string } }) => {
  const obj = await sqlClient.faqCategory.findUnique({
    where: {
      id: params.categoryId,
    },
    include: {
      FAQ: true, // Include the FAQ property
    },
  });
  //console.log(`FaqCategoryEditPage: ${JSON.stringify(obj)}`);

  let action = "Edit";
  if (obj === null) action = "Create";

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <FaqCategoryEdit initialData={obj} action={action} />
      </div>
    </div>
  );
};

export default FaqCategoryEditPage;

import { sqlClient } from "@/lib/prismadb";
import { FaqCategoryEdit } from "./faqCategory-edit";

type Params = Promise<{ storeId: string; categoryId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function FaqCategoryEditPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

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
}

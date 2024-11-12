import { sqlClient } from "@/lib/prismadb";
import { EditStoreTable } from "./edit-store-table";

type Params = Promise<{ storeId: string; tableId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function StoreTableEditPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

  const obj = await sqlClient.storeTables.findUnique({
    where: {
      id: params.tableId,
    },
  });

  let action = "Edit";
  if (obj === null) action = "Create";

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <EditStoreTable initialData={obj} action={action} />
      </div>
    </div>
  );
}

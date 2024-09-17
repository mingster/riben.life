import { sqlClient } from "@/lib/prismadb";
import { EditStoreTable } from "./edit-store-table";

const StoreTableEditPage = async ({
  params,
}: { params: { storeId: string; tableId: string } }) => {
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
};

export default StoreTableEditPage;

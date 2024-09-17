import { sqlClient } from "@/lib/prismadb";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { StoreEditTabs } from "./tabs";

const StoreEditPage = async ({ params }: { params: { storeId: string } }) => {
  const store = await sqlClient.store.findUnique({
    where: {
      id: params.storeId,
    },
    include: {
      Categories: true,
      StoreAnnouncement: true,
      Owner: true,
      Products: true,
      StoreOrders: true,
    },
  });
  transformDecimalsToNumbers(store);

  //console.log(`store: ${JSON.stringify(store)}`);

  const action = "Edit";
  //if (user === null) action = "New";

  if (store === null) return;

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <StoreEditTabs initialData={store} action={action} />
      </div>
    </div>
  );
};

export default StoreEditPage;

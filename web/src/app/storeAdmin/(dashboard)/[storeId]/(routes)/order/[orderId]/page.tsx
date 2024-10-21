//create or edit store order

import { sqlClient } from "@/lib/prismadb";
import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import getStoreWithCategories from "@/actions/get-store";

import { transformDecimalsToNumbers } from "@/lib/utils";
import type { StoreWithProducts, StoreOrder } from "@/types";
import { OrderEditClient } from "./client";
import getStoreWithProducts from "@/actions/get-store-with-products";

const OrderEditPage = async ({
  params,
}: { params: { orderId: string; storeId: string } }) => {
  await checkStoreAccess(params.storeId);
  //const store = (await getStoreWithCategories(params.storeId)) as Store;
  const store = (await getStoreWithProducts(
    params.storeId,
  )) as StoreWithProducts;

  const order = (await sqlClient.storeOrder.findUnique({
    where: {
      id: params.orderId,
    },
    include: {
      OrderNotes: true,
      OrderItemView: {
        include: {
          Product: true,
        },
      },
      User: true,
      ShippingMethod: true,
      PaymentMethod: true,
    },
  })) as StoreOrder | null;

  transformDecimalsToNumbers(order);
  //console.log('order', JSON.stringify(order));

  let action = "Edit";
  if (order === null) action = "Create";

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OrderEditClient store={store} order={order} action={action} />
      </div>
    </div>
  );
};

export default OrderEditPage;

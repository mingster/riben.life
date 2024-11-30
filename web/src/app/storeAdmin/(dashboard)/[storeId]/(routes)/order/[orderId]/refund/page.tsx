//create or edit store order

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";

import getOrderById from "@/actions/get-order-by_id";
import getStoreWithProducts from "@/actions/get-store-with-products";
import type { StoreOrder, StoreWithProducts } from "@/types";
import { OrderRefundClient } from "./refund-client";

type Params = Promise<{ storeId: string; orderId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// store admin can refund full or partial order
export default async function OrderRefundPage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const params = await props.params;

  await checkStoreAccess(params.storeId);
  //const store = (await getStoreWithCategories(params.storeId)) as Store;
  const store = (await getStoreWithProducts(
    params.storeId,
  )) as StoreWithProducts;

  const order = (await getOrderById(params.orderId)) as StoreOrder | null;
  /*
  let order = (await sqlClient.storeOrder.findUnique({
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
  */

  //console.log('order', JSON.stringify(order));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <OrderRefundClient store={store} order={order} />
      </div>
    </div>
  );
}

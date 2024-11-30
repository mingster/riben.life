//create or edit store order

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { sqlClient } from "@/lib/prismadb";

import type { Store, StoreOrder } from "@/types";


const OrderRefundPage = async (props: {
  params: Promise<{ orderId: string; storeId: string }>;
}) => {
  const params = await props.params;
  await checkStoreAccess(params.storeId);
  //const store = (await getStoreWithCategories(params.storeId)) as Store;


  //console.log('order', JSON.stringify(order));
  //console.log('payment method', JSON.stringify(order.PaymentMethod));

  const store = (await getStoreById(order.storeId)) as Store;

  // call to payment method's refund api
  if (order.PaymentMethod?.payUrl === "linepay") {
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">REFUND</div>
    </div>
  );
};

export default OrderRefundPage;

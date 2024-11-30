//create or edit store order

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { sqlClient } from "@/lib/prismadb";

import type { Store, StoreOrder } from "@/types";

// display order and its items for user to select items to refund
const OrderRefundPage = async (props: {
  params: Promise<{ orderId: string; storeId: string }>;
}) => {
  const params = await props.params;
  const store = await checkStoreAccess(params.storeId);

  //console.log('order', JSON.stringify(order));
  //console.log('payment method', JSON.stringify(order.PaymentMethod));

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">REFUND</div>
    </div>
  );
};

export default OrderRefundPage;

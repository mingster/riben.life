"use client";

import { DisplayOrder } from "@/components/order-display";
import { getOrdersToday, removePreviousOrders } from "@/lib/order-history";
import type { StoreOrder } from "@/types";
import { useSearchParams } from "next/navigation";

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayStoreOrdersToday: React.FC = () => {
  const param = useSearchParams();
  const storeId = param.get("storeId");
  const orders = getOrdersToday() as StoreOrder[];

  // filter orders by store id
  orders.map((order: StoreOrder) => {
    if (order.storeId !== storeId) {
      const index = orders.indexOf(order);
      orders.splice(index);
      //console.log('orders storeId not matched', JSON.stringify(orders));
    }
  });

  // remove previous orders in local storage
  removePreviousOrders();

  if (orders.length > 0) {
    return (
      <div className="flex flex-col">
        <div className="flex-1 p-1 pt-1 space-y-1">
          {orders.map((order: StoreOrder) => (
            <div key={order.id}>
              <DisplayOrder order={order} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <></>;
};

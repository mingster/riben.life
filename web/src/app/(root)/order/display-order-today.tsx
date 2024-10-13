"use client";

import { auth } from "@/auth";
import { DisplayOrder } from "@/components/order-display";
import { GetSession } from "@/lib/auth/utils";
import { getOrdersToday, getOrdersFromLocal, removePreviousOrders, getOrdersTodayByStore } from "@/lib/order-history";
import type { StoreOrder } from "@/types";
import axios from "axios";

import { useSession } from "next-auth/react";

import { useSearchParams } from "next/navigation";

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayStoreOrdersToday: React.FC = () => {
  const param = useSearchParams();
  const storeId = param.get("storeId");

  const orders = getOrdersFromLocal() as StoreOrder[];
  //console.log('orders', JSON.stringify(orders));

  // if user is signed in, update the local storage orders, to link to the user
  const { data: session } = useSession();
  if (session?.user?.id) {
    // construct orderIds to update in backend database
    const orderIds: string[] = [];
    orders.map((order: StoreOrder) => {
      if (!order.userId)
        orderIds.push(order.id);
    });

    updateOrders(orderIds);

    // update the local storage orders
    const userId = session?.user?.id;
    orders.map((order: StoreOrder) => {
      if (!order.userId)
        order.userId = userId;
    });
    localStorage.setItem("orders", JSON.stringify(orders));
  }


  const orders2 = getOrdersTodayByStore(storeId) as StoreOrder[];

  // remove previous orders in local storage
  //removePreviousOrders();

  if (orders2.length > 0) {
    return (
      <div className="flex flex-col">
        <div className="flex-1 p-1 pt-1 space-y-1">
          {orders2.map((order: StoreOrder) => (
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

const updateOrders = async (orderIds: string[]) => {
  console.log('orderIds', orderIds);

  const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
  await axios.patch(
    url,
    {
      orderIds: orderIds
    }
  );

  return;
}

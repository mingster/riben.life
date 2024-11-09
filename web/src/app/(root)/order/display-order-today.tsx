"use client";

import { DisplayOrder } from "@/components/order-display";
import {
  getOrdersFromLocal,
  getOrdersToday,
  getOrdersTodayByStore,
  removePreviousOrders,
  saveOrderToLocal,
} from "@/lib/order-history";
import type { StoreOrder } from "@/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

// view order page (購物明細)
// show orders in local storage placed today
// NOTE: we need local storage because we allow anonymous user to place order
export const DisplayStoreOrdersToday: React.FC = () => {
  const param = useSearchParams();
  const storeId = param.get("storeId");
  if (!storeId) return <></>;

  const orders_local = getOrdersFromLocal() as StoreOrder[];
  //console.log('orders_local', JSON.stringify(orders_local));

  // construct orderIds to update in backend database
  const orderIds: string[] = [];
  orders_local.map((order: StoreOrder) => {
    if (order)
      orderIds.push(order.id);
  });

  updateOrders(storeId, orderIds);

  //console.log("orderIds", orderIds);

  const orders_today = getOrdersTodayByStore(storeId) as StoreOrder[];

  //
  /*
    // if user is signed in, update local storage orders
    const { data: session } = useSession();
    if (session?.user?.id) {

      // construct orderIds to update in backend database
      const orderIds: string[] = [];
      orders_local.map((order: StoreOrder) => {
        if (!order.userId) orderIds.push(order.id);
      });
      updateOrders(orderIds);

      // update local storage orders
      const userId = session?.user?.id;
      orders_local.map((order: StoreOrder) => {
        if (!order.userId) order.userId = userId;
      });
      localStorage.setItem("orders", JSON.stringify(orders_local));
    }
  */

  //const orders_today = getOrdersTodayByStore(storeId) as StoreOrder[];
  //const orders_today = getOrdersFromLocal() as StoreOrder[];
  //console.log("orders_today", JSON.stringify(orders_today));

  // remove previous orders in local storage
  //removePreviousOrders();

  if (orders_today.length > 0) {
    return (
      <div className="flex flex-col">
        <div className="flex-1 p-1 pt-1 space-y-1">
          {orders_today.map((order: StoreOrder) => (
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

const updateOrders = async (storeId: string, orderIds: string[]) => {
  console.log("orderIds", orderIds);

  const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
  await axios.patch(url, {
    orderIds: orderIds,
  });

  syncOrders(storeId, orderIds);

  return;
};


// sync given orderIds from backend to local
export const syncOrders = async (storeId: string, orderIds: string[]) => {
  console.log("orderIds", orderIds);

  const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${storeId}/get-orders`;

  //1.get order from backend
  const orders = await axios.patch(url, {
    orderIds: orderIds,
  });

  console.log("syncOrders", JSON.stringify(orders));

  //2.save order to local
  //saveOrderToLocal(order);

  /*
  const existingOrders = JSON.parse(localStorage.getItem("orders") || "[]");

  existingOrders.push(orders);
  localStorage.setItem("orders", JSON.stringify(existingOrders));
  removePreviousOrders();

  */
}

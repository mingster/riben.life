"use client";

import { DisplayOrder } from "@/components/order-display";
import {
  getOrdersFromLocal,
} from "@/lib/order-history";
import type { StoreOrder } from "@/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// view order page (購物明細)
// show orders in local storage placed today
// NOTE: we need local storage because we allow anonymous user to place order
export const DisplayStoreOrdersToday: React.FC = () => {
  const param = useSearchParams();
  const storeId = param.get("storeId");
  if (!storeId) return <></>;

  const orders_local = getOrdersFromLocal();
  //console.log('orders_local', orders_local);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${storeId}/get-orders`;
    const body = JSON.stringify({
      orderIds: orders_local
    });

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body,
    })
      .then((res) => res.json())
      .then((data) => {
        //console.log('data', JSON.stringify(data));

        setOrders(data);
      });
  }, [storeId, orders_local]);

  //console.log('orders_today', JSON.stringify(orders));


  // remove non-today's orders from local storage

  //
  /*
  // if user is signed in, update the orders
  const { data: session } = useSession();
  if (session?.user?.id) {
    linkOrders(orders_local);
  }

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

  //removePreviousOrders();

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


const linkOrders = async (orderIds: string[]) => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
  await axios.patch(url, {
    orderIds: orderIds,
  });
}

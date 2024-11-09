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
  console.log('orders_local', JSON.stringify(orders_local));

  // construct orderIds to update in backend database
  const orderIds: string[] = [];
  orders_local.map((order: StoreOrder) => {
    if (order?.id)
      orderIds.push(order.id);
  });

  const [loading, setLoading] = useState(false);
  const [awaiting4ProcessingOrders, setAwaiting4ProcessingOrders] = useState([]);

  const fetchData = () => {
    setLoading(true);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${storeId}/get-orders`;

    const options = {
      method: "GET",
      body: JSON.stringify(orderIds),
    }

    fetch(url, options)
      .then((data) => {
        return data.json();
      })
      .then((data) => {
        console.log("data", JSON.stringify(data));

        setAwaiting4ProcessingOrders(data);
        //console.log("awaiting4ProcessingOrders", JSON.stringify(awaiting4ProcessingOrders));

      })
      .catch((err) => {
        console.log(err);
      });
    //setCount(count + 5);

    setLoading(false);
  };

  const IntervaledContent = () => {
    useEffect(() => {
      //Implementing the setInterval method
      const interval = setInterval(() => {
        fetchData();
      }, 5000); // do every 15 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, []);

    return <></>;
  };


  //updateOrders(storeId, orderIds);

  //console.log("orderIds", orderIds);

  //const orders_today = getOrdersTodayByStore(storeId) as StoreOrder[];
  //console.log("orders_today", JSON.stringify(orders_today));

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

  /*
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
    */

  return <><IntervaledContent /></>;
};

const updateOrders = async (storeId: string, orderIds: string[]) => {
  console.log("orderIds", orderIds);

  // 1. get order from backend

  // 2. link order if user is signed in
  linkOrders(storeId, orderIds);

};

const linkOrders = async (storeId: string, orderIds: string[]) => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
  await axios.patch(url, {
    orderIds: orderIds,
  });
}

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

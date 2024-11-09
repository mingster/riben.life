"use client";

import { AskUserToSignIn } from "@/components/ask-user-to-signIn";
import { DisplayOrder } from "@/components/order-display";
import { Button } from "@/components/ui/button";
import {
  getOrdersFromLocal,
} from "@/lib/order-history";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder } from "@/types";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const linkOrders = async () => {
    // if user is signed in, update the orders
    if (session?.user?.id) {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
      await axios.patch(url, {
        orderIds: orders_local,
      });
    }
  }

  const removeOutedLocalOrders = () => {

    // filter orders by date
    const today = new Date();
    const orders = getOrdersFromLocal() as StoreOrder[];
    //console.log("orders_local", JSON.stringify(orders));

    return orders.filter((order: StoreOrder) => {
      const orderDate = new Date(order.updatedAt);
      return (
        orderDate.getFullYear() === today.getFullYear() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getDate() === today.getDate() &&
        order.storeId === storeId
      );
    });

  }

  const fetchData = () => {
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
  };

  const IntervaledContent = () => {
    useEffect(() => {
      //Implementing the setInterval method
      const interval = setInterval(() => {
        fetchData();
        linkOrders();
      }, 5000); // do every 5 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, []);

    return <></>;
  };

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

  return (
    <section className="relative w-full">
      <div className="container">
        <h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>

        <IntervaledContent />

        <div className="flex flex-col">
          <div className="flex-1 p-1 pt-1 space-y-1">
            {orders.map((order: StoreOrder) => (
              <div key={order.id}>
                <DisplayOrder order={order} />
              </div>
            ))}
          </div>

        </div>


        <Link href="/" className="">
          <Button className="w-full">
            {t("cart_summary_keepShopping")}
          </Button>{" "}
        </Link>

        <AskUserToSignIn />
      </div>
    </section>
  );
};


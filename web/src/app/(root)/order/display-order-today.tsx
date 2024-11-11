"use client";

import { AskUserToSignIn } from "@/components/ask-user-to-signIn";
import { DisplayOrder } from "@/components/order-display";
import { Button } from "@/components/ui/button";
import {
  KEY_LOCALORDERS,
  getOrdersFromLocal,
  removeOrdersFromLocal,
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
  const [orders, setOrders] = useState([]);
  const { lng } = useI18n();
  const { t } = useTranslation(lng);
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  const param = useSearchParams();
  const storeId = param.get("storeId");
  if (!storeId) return <></>;

  //console.log('orders_local', orders_local);

  if (!mounted) {
    return null;
  }

  const linkOrders = async () => {
    // if user is signed in, update the orders
    if (session?.user?.id) {
      const orders_local = getOrdersFromLocal();

      const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/account/link-orders`;
      await axios.patch(url, {
        orderIds: orders_local,
      });
    }
  };

  const removeOutedLocalOrders = () => {
    // filter orders by date
    const today = new Date(Date.now());
    const orderArray = JSON.parse("[]");

    orders.map((order: StoreOrder) => {
      //orders is from fetchData()
      const orderDate = new Date(order.updatedAt);
      if (
        orderDate.getFullYear() === today.getFullYear() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getDate() === today.getDate()
        //&& order.storeId === storeId
      ) {
        orderArray.push(order.id);
      }
    });

    //console.log('orderArray', orderArray);
    // update local storage
    removeOrdersFromLocal();
    localStorage.setItem(KEY_LOCALORDERS, JSON.stringify(orderArray));
  };

  const fetchData = () => {
    const orders_local = getOrdersFromLocal();
    //console.log("orders_local", orders_local);

    const url = `${process.env.NEXT_PUBLIC_API_URL}/store/${storeId}/get-orders`;
    const body = JSON.stringify({
      orderIds: orders_local,
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
        removeOutedLocalOrders();
      }, 15000); // do every 15 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, []);

    return <></>;
  };

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

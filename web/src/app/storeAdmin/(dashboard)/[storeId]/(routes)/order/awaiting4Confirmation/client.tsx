"use client";

import type { Store } from "@/types";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns";
import { OrderPending } from "../../components/order-pending";

export interface props {
  store: Store;
}

// Awaiting4ProcessingClient
// it checks for new orders every 5 seconds.
export const Awaiting4ConfirmationClient: React.FC<props> = ({ store }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [loading, setLoading] = useState(false);

  const date = new Date();
  const [pendingOrders, setPendingOrders] = useState([]);

  const fetchData = () => {
    setLoading(true);

    // get pending and processing orders in the store.
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-for-confirmation`;
    fetch(url)
      .then((data) => {
        return data.json();
      })
      .then((data) => {
        //console.log("data", JSON.stringify(data));
        setPendingOrders(data);
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
      }, 5000); // do every 5 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, []);

    return <></>;
  };

  //console.log(JSON.stringify(storeData));
  return (
    <section className="relative w-full">
      <IntervaledContent />
      <div className="flex flex-col gap-1">
        <OrderPending
          storeId={store.id}
          orders={pendingOrders}
          parentLoading={loading}
        />
        <div className="text-xs">{format(date, "yyyy-MM-dd HH:mm:ss")}</div>
      </div>
    </section>
  );
};

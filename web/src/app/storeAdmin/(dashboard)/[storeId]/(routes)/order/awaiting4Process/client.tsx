"use client";

import type { Store, StoreOrder } from "@/types";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns";
import { OrderStatus, StoreLevel } from "@/types/enum";
import { OrderInProgress } from "../../components/order-inprogress";
import { OrderPending } from "../../components/order-pending";

export interface props {
  store: Store;
}

// Awaiting4ProcessingClient
// it checks for new orders every 5 seconds.
export const Awaiting4ProcessingClient: React.FC<props> = ({ store }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [loading, setLoading] = useState(false);

  const date = new Date();
  const [awaiting4ProcessingOrders, setAwaiting4ProcessingOrders] = useState(
    [],
  );
  const [pendingOrders, setPendingOrders] = useState([]);

  const fetchData = () => {
    setLoading(true);

    // get pending and processing orders in the store.
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-for-process`;
    fetch(url)
      .then((data) => {
        return data.json();
      })
      .then((data) => {
        //console.log("data", JSON.stringify(data));

        setAwaiting4ProcessingOrders(data);

        /*
        if (store.requirePrepaid) {
          const prepayOrders = data.filter((order: StoreOrder) => order.isPaid);
          setPendingOrders(
            prepayOrders.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Pending ||
                order.orderStatus === OrderStatus.InShipping,
            ),
          );
          setAwaiting4ProcessingOrders(
            prepayOrders.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Processing,
            ),
          );
        } else {
          setPendingOrders(
            data.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Pending ||
                order.orderStatus === OrderStatus.InShipping,
            ),
          );
          setAwaiting4ProcessingOrders(
            data.filter(
              (order: StoreOrder) =>
                order.orderStatus === OrderStatus.Processing,
            ),
          );
        }
        */
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
  /*
          {!store.autoAcceptOrder && (
            <OrderPending
              storeId={store.id}
              orders={pendingOrders}
              parentLoading={loading}
            />
          )}

  */

  return (
    <section className="relative w-full">
      <div className="container">
        <IntervaledContent />
        {store.requirePrepaid && "只會顯示已付款訂單。"}

        <div className="flex flex-col gap-5">
          <OrderInProgress
            storeId={store.id}
            autoAcceptOrder={store.autoAcceptOrder}
            orders={awaiting4ProcessingOrders}
            parentLoading={loading}
          />
          <div className="text-xs">{format(date, "yyyy-MM-dd HH:mm:ss")}</div>
        </div>
      </div>
    </section>
  );
};

"use client";

import type { Store, StoreOrder } from "@/types";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns";
import { OrderStatus, StoreLevel } from "@/types/enum";
import { OrderInProgress } from "../../components/order-inprogress";
import { OrderPending } from "../../components/order-pending";
import { Loader } from "@/components/ui/loader";
import { formatDateTime } from "@/lib/utils";

export interface props {
  store: Store;
}

// Awaiting4ProcessingClient
// it checks for new orders every 5 seconds.
export const Awaiting4ProcessingClient: React.FC<props> = ({ store }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const date = new Date();
  const [awaiting4ProcessingOrders, setAwaiting4ProcessingOrders] = useState(
    [],
  );

  const fetchData = useCallback(() => {
    setLoading(true);

    // get processing orders in the store.
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

    setLoading(false);
  }, [store.id]);

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

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    // fetch data as soon as page is mounted
    if (!mounted) fetchData();
    setMounted(true);
  }, [mounted, fetchData]);

  if (!mounted) {
    return null;
  }

  if (loading) return <Loader />;
  return (
    <section className="relative w-full">
      <IntervaledContent />
      {store.requirePrepaid && (
        <div className="text-muted-foreground text-xs">
          只會顯示已付款訂單。
        </div>
      )}

      <div className="flex flex-col gap-1">
        <OrderInProgress
          store={store}
          autoAcceptOrder={store.autoAcceptOrder}
          orders={awaiting4ProcessingOrders}
          parentLoading={loading}
        />
        <div className="text-xs">{formatDateTime(date)}</div>
      </div>
    </section>
  );
};

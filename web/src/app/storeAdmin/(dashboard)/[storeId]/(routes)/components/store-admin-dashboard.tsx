"use client";

import type { Store, StoreOrder } from "@/types";
import { useCallback, useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns";

import { Heading } from "@/components/ui/heading";
import { OrderInProgress } from "./order-inprogress";
import { OrderPending } from "./order-pending";
import { OrderStatus, StoreLevel } from "@/types/enum";
import { useIsMounted } from 'usehooks-ts'

export interface props {
  store: Store;
}

// store admin home page.
// it checks for new orders every 10 seconds.
export const StoreAdminDashboard: React.FC<props> = ({ store }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [loading, setLoading] = useState(false);

  const date = new Date();
  const [awaiting4ProcessingOrders, setAwaiting4ProcessingOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);

  const fetchData = () => {
    setLoading(true);

    // get pending and processing orders in the store.
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-orders`;
    fetch(url)
      .then((data) => {
        return data.json();
      })
      .then((data) => {
        //console.log("data", JSON.stringify(data));

        if (store.requirePrepay) {
          const prepayOrders = data.filter((order: StoreOrder) => order.isPaid);
          setPendingOrders(prepayOrders.filter((order: StoreOrder) => order.orderStatus === OrderStatus.Pending || order.orderStatus === OrderStatus.InShipping));
          setAwaiting4ProcessingOrders(prepayOrders.filter((order: StoreOrder) => order.orderStatus === OrderStatus.Processing));
        } else {
          setPendingOrders(data.filter((order: StoreOrder) => order.orderStatus === OrderStatus.Pending || order.orderStatus === OrderStatus.InShipping));
          setAwaiting4ProcessingOrders(data.filter((order: StoreOrder) => order.orderStatus === OrderStatus.Processing));
        }
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
      }, 10000); // do every 10 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, []);

    return <></>;
  };

  //console.log(JSON.stringify(storeData));
  /*
        <CardDataStats
          title={t("Revenue_Today")}
          total="$47,2K"
          rate="4.35%"
          levelUp
        >
          <DollarSign />
        </CardDataStats>

  <section className="mx-auto flex flex-col max-w-[980px] items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6 content-center">
</section>

  */
  return (
    <section className="relative w-full">
      <div className="container">
        <IntervaledContent />
        {store.requirePrepay && '只會顯示已付款訂單。'}

        <div className='flex flex-col gap-5'>
          <OrderPending
            storeId={store.id}
            orders={pendingOrders}
            parentLoading={loading}
          />
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

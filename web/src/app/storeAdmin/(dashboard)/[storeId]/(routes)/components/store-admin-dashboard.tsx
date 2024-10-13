"use client";

import type { Store, StoreOrder } from "@/types";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns";
import { InProgressOrder } from "./order-inprogress";
import { Heading } from "@/components/ui/heading";

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
  const [awaiting4ProcessingOrders, setAwaiting4ProcessingOrders] = useState(
    [],
  );


  const fetchData = () => {
    setLoading(true);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-awaiting-orders`;
    fetch(url)
      .then((data) => {
        return data.json();
      })
      .then((data) => {
        if (store.requirePrepay) {
          const prepayOrders = data.filter((order: StoreOrder) => order.isPaid);
          console.log("prepayOrders", JSON.stringify(prepayOrders));
          setAwaiting4ProcessingOrders(prepayOrders);
        } else {
          setAwaiting4ProcessingOrders(data);
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

        {store.requirePrepay && <Heading title="待確認訂單" description="請勾選來接單。" badge={10} className="pt-1 pb-10" />}


        <InProgressOrder
          storeId={store.id}
          autoAcceptOrder={store.autoAcceptOrder}
          orders={awaiting4ProcessingOrders}
          parentLoading={loading}
        />
        <div className="text-xs">{format(date, "yyyy-MM-dd HH:mm:ss")}</div>




        <Heading title="現金結帳管理" description="..." className="pt-20" />


        <div className="relative flex w-full justify-center">


        </div>
      </div>
    </section>
  );
};

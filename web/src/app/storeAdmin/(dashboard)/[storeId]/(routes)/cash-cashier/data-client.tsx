"use client";

import type { Store } from "@/types";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { format } from "date-fns";

import { StoreLevel } from "@/types/enum";
import { OrderUnpaid } from "../components/order-unpaid";
import type { StoreTables } from "@prisma/client";

export interface props {
  store: Store;
  tables: StoreTables[];
}

// store admin home page.
// it checks for new orders every 10 seconds.
export const CashCashier: React.FC<props> = ({ store, tables }) => {
  const { lng } = useI18n();
  const { t } = useTranslation(lng, "storeAdmin");

  const [loading, setLoading] = useState(false);

  const date = new Date();
  const [unpaidOrders, setUnpaidOrders] = useState([]);

  const fetchData = () => {
    setLoading(true);

    // get pending and processing orders in the store.
    const url = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${store.id}/orders/get-unpaid-orders`;
    fetch(url)
      .then((data) => {
        return data.json();
      })
      .then((data) => {
        //console.log("data", JSON.stringify(data));
        setUnpaidOrders(data);
      })
      .catch((err) => {
        console.log(err);
      });

    setLoading(false);
  };

  const IntervaledContent = () => {
    useEffect(() => {
      //Implementing the setInterval method
      const interval = setInterval(() => {
        fetchData();
      }, 5000); // do every 10 sec.

      //Clearing the interval
      return () => clearInterval(interval);
    }, []);

    return <></>;
  };

  return (
    <section className="relative w-full">
      <div className="container">
        <IntervaledContent />
        <div className="flex flex-col gap-5">
          {store.level !== StoreLevel.Free && (
            <>
              <OrderUnpaid
                store={store}
                tables={tables}
                orders={unpaidOrders}
                parentLoading={loading}
              />
              <div className="text-xs">
                {format(date, "yyyy-MM-dd HH:mm:ss")}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

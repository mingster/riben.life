"use client";
import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { StoreOrder } from "@/types";
import type { orderitemview } from "@prisma/client";
import { format } from "date-fns/format";
import { DisplayOrder } from "@/components/order-display";

/*
const getOrderItems = async (orderId: string) => {
  const url = `${process.env.NEXT_PUBLIC_API_URL}/${process.env.NEXT_PUBLIC_STORE_ID}/storeOrder/orderItem/${orderId}`;
  console.log(url);
  return (await axios.get(url).then((response) => response.data)) as OrderItem[];
};
*/
type orderTabProps = { orders: StoreOrder[]; status: OrderStatus };
export const DisplayOrders = ({ orders, status }: orderTabProps) => {
  const router = useRouter();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "account");

  //sort orders by updateAt

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 p-1 pt-1 space-y-1">
          {orders.map((order: StoreOrder) => (
            <div key={order.id}>
              {order.orderStatus === status && <DisplayOrder order={order} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

type props = { orders: StoreOrder[] };
export const OrderTab = ({ orders }: props) => {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("ordertab");
  const [activeTab, setActiveTab] = useState(
    initialTab || OrderStatus[OrderStatus.Pending],
  );

  const handleTabChange = (value: string) => {
    //update the state
    setActiveTab(value);
    // update the URL query parameter
    //router.push({ query: { tab: value } });
  };

  // if the query parameter changes, update the state
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  //console.log('selectedTab: ' + activeTab);
  const keys = Object.keys(OrderStatus).filter((v) => Number.isNaN(Number(v)));
  //const vals = Object.keys(OrderStatus).filter((v) => !Number.isNaN(Number(v)));
  //console.log(keys);

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "account");

  return (
    <Tabs
      value={activeTab}
      defaultValue="orders"
      onValueChange={handleTabChange}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-6">
        {keys.map((key) => (
          <TabsTrigger key={key} value={key}>
            {/*<Badge badgeContent= color="primary"></Badge>*/}
            {t(`OrderStatus_${key}`)}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={OrderStatus[OrderStatus.Pending]}>
        <DisplayOrders orders={orders} status={OrderStatus.Pending} />
      </TabsContent>
      <TabsContent value={OrderStatus[OrderStatus.Processing]}>
        <DisplayOrders orders={orders} status={OrderStatus.Processing} />
      </TabsContent>
      <TabsContent value={OrderStatus[OrderStatus.InShipping]}>
        <DisplayOrders orders={orders} status={OrderStatus.InShipping} />
      </TabsContent>
      <TabsContent value={OrderStatus[OrderStatus.Completed]}>
        <DisplayOrders orders={orders} status={OrderStatus.Completed} />
      </TabsContent>
      <TabsContent value={OrderStatus[OrderStatus.Refunded]}>
        <DisplayOrders orders={orders} status={OrderStatus.Refunded} />
      </TabsContent>
      <TabsContent value={OrderStatus[OrderStatus.Cancelled]}>
        <DisplayOrders orders={orders} status={OrderStatus.Cancelled} />
      </TabsContent>
    </Tabs>
  );
};

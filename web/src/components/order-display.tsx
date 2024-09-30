"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { StoreOrder } from "@/types";
import type { orderitemview } from "@prisma/client";
import { format } from "date-fns/format";

type props = {
  orderId: string;
};
type orderProps = { order: StoreOrder };

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayOrder: React.FC<orderProps> = ({ order }) => {
  const router = useRouter();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "account");

  if (!order) {
    return "no order";
  }

  //console.log('order items: ' + JSON.stringify(orders));
  const buyAgain = async (orderId: string) => { };
  const pay = async (orderId: string) => {
    const url = `/checkout/${orderId}/stripe/`;
    console.log(url);
    router.push(url);
  };

  const contactSeller = (storeId: string, orderId: string) => {
    router.push(`${storeId}/support/new?orderid=${orderId}`);
  };

  return (
    <Card key={order.id} className="pt-1 pb-1">
      <CardContent>
        <div className="grid grid-cols-2 gap-1 justify-items-stretch">
          <div className="whitespace-nowrap text-nowrap">
            {/* order items */}
            {order.OrderItemView.map((item: orderitemview) => (
              <div key={item.id} className="flex ">
                <div className="pr-2">{item.name}</div>
                <div className="">
                  <div className="pr-2">x{item.quantity}</div>
                </div>
                <div className="justify-self-end place-self-end">
                  <div>${Number(item.unitPrice)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="justify-self-end whitespace-nowrap text-nowrap text-xs font-mono">
            {format(order.createdAt, "yyyy/MM/dd HH:mm")}
          </div>
        </div>
        {/*
                    <div className="grid grid-cols-3 gap-1 justify-items-stretch">
                        <div className="flex whitespace-nowrap">
                            <div className="hidden sm:block">
                                <div className="pr-2">{order.shippingAddress}</div>
                            </div>
                            {t('ShippingStatus_' + ShippingStatus[order.shippingStatus])}
                        </div>
                        <div className="hidden sm:block justify-self-end">
                            {t('shippingCost_label')}
                        </div>
                        <div className="hidden sm:block justify-self-end">
                            ${Number(order.shippingCost)}
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-1 justify-items-stretch">
                        <div className="whitespace-nowrap">{order.shippingMethod.name}</div>
                        <div className="hidden sm:block justify-self-end">{t('tax_label')}</div>
                        <div className="hidden sm:block justify-self-end">
                            ${Number(order.orderTax)}
                        </div>
                    </div>
 */}
      </CardContent>
      <CardFooter className=" place-content-end items-end pt-0 pb-1 flex flex-col">
        <div className="grid grid-flow-row-dense grid-cols-3 gap-1 place-items-end">
          <div className="justify-self-end place-self-end whitespace-nowrap">
            {t(
              `PaymentStatus_${PaymentStatus[order.paymentStatus]}`,
            )}
          </div>
          <div className="justify-self-end place-self-end whitespace-nowrap">
            {t("orderTotal_label")}
          </div>
          <div className="justify-self-end place-self-end whitespace-nowrap">
            ${Number(order.orderTotal)} {order.currency}
          </div>
        </div>

        <div className="">
          {order.orderStatus === OrderStatus.Pending && (
            <Button
              className="mr-2"
              size="sm"
              onClick={() => pay(order.id)}
            >
              {t("order_tab_pay")}
            </Button>
          )}
          {(order.orderStatus === OrderStatus.Completed ||
            order.orderStatus === OrderStatus.InShipping) && (
              <Button
                className="mr-2"
                size="sm"
                onClick={() => buyAgain(order.id)}
              >
                {t("order_tab_buyAgain")}
              </Button>
            )}
          <Button
            size="sm"
            onClick={() => contactSeller(order.storeId, order.id)}
          >
            {t("order_tab_contact_seller")}
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
};

"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import { useRouter } from "next/navigation";

import type { StoreOrder } from "@/types";
import type { orderitemview, PaymentMethod } from "@prisma/client";
import { format } from "date-fns/format";
import Currency from "./currency";

type orderProps = { order: StoreOrder };

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayOrder: React.FC<orderProps> = ({ order }) => {
  const router = useRouter();

  const { lng } = useI18n();
  const { t } = useTranslation(lng, "account");

  if (!order) {
    return "no order";
  }

  if (!order.OrderItemView) {
    return <></>;
  }

  //console.log('order', JSON.stringify(order));

  const buyAgain = async (orderId: string) => {};
  const pay = async (orderId: string, payUrl?: string) => {
    let purl = payUrl;
    if (!purl) purl = "stripe";

    const url = `/checkout/${orderId}/${purl}/`;
    //console.log(url);
    router.push(url);
  };

  const contactSeller = (storeId: string, orderId: string) => {
    router.push(`${storeId}/support/new?orderid=${orderId}`);
  };

  return (
    <Card key={order.id} className="pt-1 pb-1">
      <CardContent>
        <div className="grid grid-cols-3 gap-1 justify-items-stretch">
          <div className="whitespace-nowrap text-nowrap">
            {order.Store?.name}
          </div>
          <div className="justify-self-end whitespace-nowrap text-nowrap text-xs font-mono">
            {order.tableId && `桌號：${order.tableId}`} 交易序號：
            {order.orderNum}
          </div>
          <div className="justify-self-end whitespace-nowrap text-nowrap text-xs font-mono">
            {format(order.createdAt, "yyyy/MM/dd HH:mm")}&nbsp;
            {order.OrderItemView.length}
          </div>
        </div>

        <div className="whitespace-nowrap text-nowrap">
          {/* order items */}
          {order.OrderItemView.map((item: orderitemview) => (
            <DisplayOrderItem key={item.id} currentItem={item} />
          ))}
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
      <CardFooter className="place-content-end items-end pt-0 pb-1 flex flex-col">
        <div className="grid grid-flow-row-dense grid-cols-3 gap-1">
          <div className="whitespace-nowrap">
            {t(`PaymentStatus_${PaymentStatus[order.paymentStatus]}`)}
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
              onClick={() => pay(order.id, order.PaymentMethod?.payUrl)}
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
  );
};

type itemViewOrops = {
  currentItem: orderitemview;
};

export const DisplayOrderItem: React.FC<itemViewOrops> = ({ currentItem }) => {
  return (
    <div className="relative ml-4 flex flex-1 flex-col justify-between sm:ml-6">
      <div className="relative pr-0 w-full">
        <div className="flex justify-between content-center">
          <div className="flex-none w-1/2 pr-2">
            {currentItem.name}

            {currentItem.variants && currentItem.variants.length > 0 && (
              <ul className="pl-2 text-sm">
                {currentItem.variants.split(",").map((itemOption) => (
                  <li key={itemOption}>{itemOption}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="pr-2">{currentItem.quantity ?? 0}</div>
          <div className="pr-2">
            <Currency value={Number(currentItem.unitPrice)} />
          </div>
        </div>
      </div>
    </div>
  );
};

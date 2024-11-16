"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { OrderStatus, PaymentStatus } from "@/types/enum";
import { useRouter } from "next/navigation";

import { formatDateTime, getTableName } from "@/lib/utils";
import type { StoreOrder } from "@/types";
import type { PaymentMethod, orderitemview } from "@prisma/client";
import { format } from "date-fns/format";
import Currency from "./currency";
import { DisplayOrderStatus } from "./order-status-display";

type orderProps = { order: StoreOrder };

// show order success prompt and then redirect the customer to view order page (購物明細)
export const DisplayOrder: React.FC<orderProps> = ({ order }) => {
  //console.log("DisplayOrder", JSON.stringify(order));

  const router = useRouter();

  const { lng } = useI18n();
  const { t } = useTranslation(lng);

  if (!order) {
    return "no order";
  }

  if (!order.OrderItemView) {
    return <></>;
  }

  //console.log('order', JSON.stringify(order));

  const buyAgain = async (orderId: string) => {
    alert(`buy again${orderId}`);
  };

  const pay = async (orderId: string, payUrl?: string) => {
    let purl = payUrl;

    // if no pay url, use stripe as default
    if (!purl) purl = "stripe";

    const url = `/checkout/${orderId}/${purl}/`;
    //console.log(url);
    router.push(url);
  };

  const contactSeller = (storeId: string, orderId: string) => {
    router.push(`${storeId}/support/new?orderid=${orderId}`);
  };

  const canPay =
    !order.isPaid &&
    order.PaymentMethod?.name !== "cash" &&
    (order.orderStatus === OrderStatus.Pending ||
      order.orderStatus === OrderStatus.Processing);

  //{order.tableId && order.tableId !== null && order.tableId !== 'null' && `桌號：${getTableName(tables, order.tableId)}`}
  return (
    <Card key={order.id} className="pt-1 pb-1">
      <CardContent>
        <div className="grid grid-cols-3 gap-1 justify-items-stretch">
          <div className="whitespace-nowrap text-nowrap">
            {order.Store?.name}
          </div>
          <div className="justify-self-end whitespace-nowrap text-nowrap text-xs font-mono">
            交易序號：{order.orderNum}
          </div>
          <div className="justify-self-end whitespace-nowrap text-nowrap text-xs font-mono">
            {formatDateTime(order.createdAt)}&nbsp;
            {order.OrderItemView.length}
          </div>
        </div>

        <div className="whitespace-nowrap text-nowrap">
          {/* order items */}
          {order.OrderItemView.map((item: orderitemview) => (
            <DisplayOrderItem key={item.id} currentItem={item} />
          ))}
        </div>
      </CardContent>
      <CardFooter className="place-content-end items-end pt-0 pb-1 flex flex-col">
        <div className="grid grid-flow-row-dense grid-cols-2 gap-1">
          <div className="justify-self-end place-self-end whitespace-nowrap">
            {t("orderTotal_label")}
          </div>

          <div className="justify-self-end place-self-end whitespace-nowrap">
            ${Number(order.orderTotal)} {order.currency}
          </div>
        </div>

        <div className="flex gap-1 items-center">
          {canPay ? (
            <Button
              className="mr-2 bg-green-900 hover:bg-green-700"
              size="sm"
              onClick={() => pay(order.id, order.PaymentMethod?.payUrl)}
            >
              {order.PaymentMethod?.name + t("order_tab_pay")}
            </Button>
          ) : (
            order.isPaid !== true &&
            order.PaymentMethod?.name === "cash" && (
              <div className="whitespace-nowrap">
                <Button
                  variant={"outline"}
                  className="mr-2 cursor-default bg-green-200 hover:bg-green-300"
                  size="sm"
                >
                  {`現金${t(`PaymentStatus_${PaymentStatus[order.paymentStatus]}`)}`}
                </Button>
              </div>
            )
          )}

          <div className="whitespace-nowrap">
            <DisplayOrderStatus
              status={order.orderStatus}
              displayBuyAgain={true}
              onCompletedStatus={() => buyAgain(order.id)}
            />
          </div>

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

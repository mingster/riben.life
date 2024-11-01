"use client";
import { createLinePayClient } from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";
import { getAbsoluteUrl } from "@/lib/utils";
import type { StoreOrder } from "@/types";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


type paymentProps = {
  order: StoreOrder;
  client: LinePayClient;
};
const PaymentLinePay: React.FC<paymentProps> = ({ order, client }) => {

  if (!order) throw Error("order is required.");

  //call payment intent api to get client secret
  useEffect(() => {
    if (order.isPaid) return;


    const confirmUrl = `${getAbsoluteUrl()}/checkout/${order.id}/linepay/confirmed`;
    const cancelUrl = `${getAbsoluteUrl()}/checkout/${order.id}/linepay/canceled`;

    const requestBody = {
      amount: order.orderTotal,
      currency: order.currency,
      orderId: order.id,
      packages: [
        order.OrderItemView.map((item) => {
          return {
            id: item.id,
            amount: Number(item.unitPrice) * item.quantity,
            products: [
              {
                name: item.name,
                quantity: item.quantity,
                price: item.unitPrice
              }
            ]
          };
        })],
      redirectUrls: {
        confirmUrl: confirmUrl,
        cancelUrl: cancelUrl
      }
    };
    console.log('linepay request', JSON.stringify(requestBody));

  }, [order]);

  return (
    <div>
      <p>PaymentLinePay</p>
    </div>
  );
}

export default PaymentLinePay;

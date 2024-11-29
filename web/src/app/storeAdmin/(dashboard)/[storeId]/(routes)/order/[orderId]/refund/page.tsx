//create or edit store order

import { checkStoreAccess } from "@/app/storeAdmin/store-admin-utils";
import { sqlClient } from "@/lib/prismadb";

import { transformDecimalsToNumbers } from "@/lib/utils";
import type { Store, StoreOrder, StoreWithProducts } from "@/types";

import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import getStoreWithProducts from "@/actions/get-store-with-products";
import { type RefundRequestBody, type RefundRequestConfig, getLinePayClientByStore } from "@/lib/linepay";
import {
  OrderStatus,
  PageAction,
  PaymentStatus,
  ReturnStatus,
  ShippingStatus,
} from "@/types/enum";
import Decimal from "decimal.js";

const OrderRefundPage = async (props: {
  params: Promise<{ orderId: string; storeId: string }>;
}) => {
  const params = await props.params;
  await checkStoreAccess(params.storeId);
  //const store = (await getStoreWithCategories(params.storeId)) as Store;

  const order = (await getOrderById(params.orderId)) as StoreOrder | null;
  if (!order) {
    throw new Error("order not found");
  }

  //console.log('order', JSON.stringify(order));
  //console.log('payment method', JSON.stringify(order.PaymentMethod));

  const store = (await getStoreById(order.storeId)) as Store;

  // call to payment method's refund api
  if (order.PaymentMethod?.payUrl === "linepay") {
    const requestBody: RefundRequestBody = {
      refundAmount: Number(order.orderTotal)
    };

    const requestConfig: RefundRequestConfig = {
      transactionId: order.checkoutAttributes,
      body: requestBody,
    };

    const linePayClient = await getLinePayClientByStore(store);

    const res = await linePayClient.refund.send(requestConfig);

    if (res.body.returnCode === "0000") {

      // refund success, update order status
      await sqlClient.storeOrder.update({
        where: {
          id: order.id,
        },
        data: {
          orderStatus: OrderStatus.Refunded,
          paymentStatus: PaymentStatus.Refunded,
        },
      });
    }
  }

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-8 pt-6">REFUND</div>
    </div>
  );
};

export default OrderRefundPage;


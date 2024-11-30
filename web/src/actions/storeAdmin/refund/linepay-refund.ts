import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import type { Store, StoreOrder } from "@prisma/client";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import {
  type RefundRequestBody,
  type RefundRequestConfig,
  getLinePayClientByStore,
} from "@/lib/linepay";
import {
  OrderStatus,
  PaymentStatus
} from "@/types/enum";


const LinePayRefund = async (orderId: string, amount: number): Promise<boolean> => {
  if (!orderId) {
    throw Error("orderId is required");
  }

  const order = (await getOrderById(orderId)) as StoreOrder | null;
  if (!order) {
    throw new Error("order not found");
  }
  const store = (await getStoreById(order.storeId)) as Store;

  const requestBody: RefundRequestBody = {
    refundAmount: Number(order.orderTotal),
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
        refundAmount: amount,
        orderStatus: OrderStatus.Refunded,
        paymentStatus: PaymentStatus.Refunded,
      },
    });

    return true;
  }






  return false;
};

export default LinePayRefund;

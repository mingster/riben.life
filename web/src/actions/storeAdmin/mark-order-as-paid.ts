import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/lib/utils";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import isProLevel from "./is-pro-level";
import getOrderById from "../get-order-by_id";

import getStoreById from "../get-store-by_id";


const MarkAsPaid = async (orderId: string): Promise<StoreOrder> => {
  if (!orderId) {
    throw Error("orderId is required");
  }

  // mark order as paid
  await sqlClient.storeOrder.update({
    where: {
      id: orderId as string,
    },
    data: {
      isPaid: true,
      paidDate: getUtcNow(),
      orderStatus: Number(OrderStatus.Processing),
      paymentStatus: Number(PaymentStatus.Paid),
    },
  });

  const order = await getOrderById(orderId) as StoreOrder;
  //const store = await getStoreById(order.storeId) as Store;
  const ispro = await isProLevel(order.storeId);

  const lastLedger = await sqlClient.storeLedger.findFirst({
    where: {
      storeId: order.storeId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 1
  });

  const balance = lastLedger ? lastLedger.balance : 0;

  // create store ledger entry
  await sqlClient.storeLedger.create({
    data: {
      orderId: order.id as string,
      storeId: order.storeId as string,
      amount: order.orderTotal,
      fee: Number(order.orderTotal) * 0.03,
      platformFee: ispro ? 0 : Number(order.orderTotal) * 0.01,
      description: `order #${order.id}`,
      balance: 0
    },
  })
  return await getOrderById(orderId) as StoreOrder;
};

export default MarkAsPaid;

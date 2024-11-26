import { sqlClient } from "@/lib/prismadb";
import { getNowTimeInTz, getUtcNow } from "@/lib/utils";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import isProLevel from "./is-pro-level";
import getOrderById from "../get-order-by_id";

import getStoreById from "../get-store-by_id";

const MarkAsPaid = async (
  orderId: string,
  checkoutAttributes: string,
): Promise<StoreOrder> => {
  if (!orderId) {
    throw Error("orderId is required");
  }

  const order = (await getOrderById(orderId)) as StoreOrder;
  const store = (await getStoreById(order.storeId)) as Store;
  const ispro = await isProLevel(order.storeId);

  if (store === null) throw Error("store is null");
  if (order === null) throw Error("order is null");
  if (order.PaymentMethod === null) throw Error("PaymentMethod is null");

  // mark order as paid
  await sqlClient.storeOrder.update({
    where: {
      id: orderId as string,
    },
    data: {
      isPaid: true,
      paidDate: getNowTimeInTz(store.defaultTimezone),
      orderStatus: Number(OrderStatus.Processing),
      paymentStatus: Number(PaymentStatus.Paid),
      checkoutAttributes: checkoutAttributes || "",
      updatedAt: getNowTimeInTz(store.defaultTimezone),
    },
  });

  // create new entry in store ledger
  //
  const lastLedger = await sqlClient.storeLedger.findFirst({
    where: {
      storeId: order.storeId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
  });

  const balance = Number(lastLedger ? lastLedger.balance : 0);

  // fee rate is determined by payment method
  const fee = -Number(
    Number(order.orderTotal) * Number(order.PaymentMethod?.fee) +
      Number(order.PaymentMethod?.feeAdditional),
  );

  const feeTax = Number(fee * 0.05);

  // fee charge by riben.life
  const platform_fee = ispro ? 0 : -Number(Number(order.orderTotal) * 0.01);

  // avilablity date = order date + payment methods' clear days
  const avaiablityDate = new Date(
    getUtcNow(store.defaultTimezone).getTime() +
      order.PaymentMethod?.clearDays * 24 * 60 * 60 * 1000,
  );

  // create store ledger entry
  await sqlClient.storeLedger.create({
    data: {
      orderId: order.id as string,
      storeId: order.storeId as string,
      amount: order.orderTotal,
      fee: fee + feeTax,
      platformFee: platform_fee,
      currency: order.currency,
      description: `order # ${order.orderNum}`,
      note: `order id: ${order.id}`,
      availablity: avaiablityDate,
      balance:
        balance +
        Math.round(Number(order.orderTotal) - (fee + feeTax) - platform_fee),
    },
  });

  return (await getOrderById(orderId)) as StoreOrder;
};

export default MarkAsPaid;

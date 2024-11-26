"use server";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import isProLevel from "@/actions/storeAdmin/is-pro-level";
import MarkAsPaid from "@/actions/storeAdmin/mark-order-as-paid";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import {
  ConfirmRequestBody,
  type ConfirmRequestConfig,
  type Currency,
  createLinePayClient,
  getLinePayClient,
} from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";
import { sqlClient } from "@/lib/prismadb";
import { getAbsoluteUrl, getUtcNow } from "@/lib/utils";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// linepay confirmed page: once user completed the linepay payment, linepay will redirect to this page
// here we check the payment status. Upon success, we mark the order as paid, and then redirect to success page.
// https://developers-pay.line.me/merchant/redirection-pages/
//
export default async function LinePayConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { orderId, transactionId } = await searchParams;
  //console.log('orderId', orderId, 'transactionId', transactionId);

  if (!orderId) {
    throw new Error("order Id is missing");
  }

  const order = (await getOrderById(orderId as string)) as StoreOrder;
  if (!order) {
    throw new Error("order not found");
  }

  if (order.checkoutAttributes !== transactionId) {
    throw new Error("transactionId not match");
  }

  // call linepay confirm api
  if (order.isPaid) {
    return (
      <Suspense fallback={<Loader />}>
        <Container>
          <SuccessAndRedirect orderId={order.id} />
        </Container>
      </Suspense>
    );
  }

  const store = (await getStoreById(order.storeId)) as Store;

  // determine line pay id and secret
  let linePayId = store.LINE_PAY_ID;
  let linePaySecret = store.LINE_PAY_SECRET;

  // this store is pro version or not?
  const isPro = await isProLevel(store?.id);
  if (isPro === false) {
    linePayId = process.env.LINE_PAY_ID || null;
    linePaySecret = process.env.LINE_PAY_SECRET || null;
  }

  if (
    !linePayId ||
    !linePaySecret ||
    linePayId === null ||
    linePaySecret === null
  ) {
    //
    return "尚未設定LinePay";
  }

  const linePayClient = getLinePayClient(
    linePayId,
    linePaySecret,
  ) as LinePayClient;

  const confirmRequest = {
    transactionId: transactionId as string,
    body: {
      currency: order.currency as Currency,
      amount: Number(order.orderTotal),
    },
  } as ConfirmRequestConfig;
  //console.log("confirmRequest", JSON.stringify(confirmRequest));

  const res = await linePayClient.confirm.send(confirmRequest);

  if (res.body.returnCode === "0000") {
    // mark order as paid

    // mark order as paid
    const checkoutAttributes = order.checkoutAttributes;
    const updated_order = await MarkAsPaid(order.id, checkoutAttributes);

    if (process.env.NODE_ENV === "development")
      console.log("LinePayConfirmedPage", JSON.stringify(updated_order));

    redirect(
      `${getAbsoluteUrl()}/checkout/${updated_order.id}/linepay/success`,
    );
  }

  return <></>;
}

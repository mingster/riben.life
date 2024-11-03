"use server";
import getOrderById from "@/actions/get-order-by_id";
import getStoreById from "@/actions/get-store-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import {
  ConfirmRequestBody,
  type ConfirmRequestConfig,
  createLinePayClient,
  type Currency,
  getLinePayClient,
} from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";
import { sqlClient } from "@/lib/prismadb";
import { getAbsoluteUrl } from "@/lib/utils";
import type { Store, StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// https://developers-pay.line.me/merchant/redirection-pages/
// here we mark the order as paid, show customer a message and redirect to account page.
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
  const linePayClient = getLinePayClient(store.LINE_PAY_ID, store.LINE_PAY_SECRET) as LinePayClient;

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

    const order = await sqlClient.storeOrder.update({
      where: {
        id: orderId as string,
      },
      data: {
        isPaid: true,
        orderStatus: Number(OrderStatus.Processing),
        paymentStatus: Number(PaymentStatus.Paid),
      },
    });

    console.log(
      `LinePayConfirmedPage: order confirmed: ${JSON.stringify(order)}`,
    );

    redirect(`${getAbsoluteUrl()}/checkout/${order.id}/linepay/success`);
  }

  return <></>;
}

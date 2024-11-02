"use server";
import getOrderById from "@/actions/get-order-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { ConfirmRequestBody, ConfirmRequestConfig, createLinePayClient } from "@/lib/linepay";
import type { LinePayClient } from "@/lib/linepay/type";
import { sqlClient } from "@/lib/prismadb";
import { getAbsoluteUrl } from "@/lib/utils";
import type { StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Stripe from "stripe";


// https://developers-pay.line.me/merchant/redirection-pages/
// here we mark the order as void,
export default async function LinePayConfirmedPage({
  searchParams,
}: {
  searchParams: {
    orderId: string;
    transactionId: string;
  };
}) {

  console.log(searchParams.orderId, searchParams.transactionId);

  if (!searchParams.orderId) {
    throw new Error("order Id is missing");
  }



  // call confirm api

  if (!process.env.LNE_PAY_ID) {
    throw new Error("LNE_PAY_ID is not set");
  }
  if (!process.env.LINE_PAY_SECRET) {
    throw new Error("LINE_PAY_SECRET is not set");
  }
  const env =
    process.env.NODE_ENV === "development" ? "development" : "production";

  let protocol = 'http:';
  if (env === 'production') {
    protocol = 'https:';
  }

  /*
  const linePayClient = createLinePayClient({
    channelId: process.env.LNE_PAY_ID,
    channelSecretKey: process.env.LINE_PAY_SECRET,
    env: env, // env can be 'development' or 'production'
  }) as LinePayClient;

  const res = await linePayClient.confirm
    .send({
      transactionId: '2021121300698360310',
      body: {
        currency: 'TWD',
        amount: 1000
      }
    });

  //redirect(`${getAbsoluteUrl()}/checkout/${order.id}/linepay/success`);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={order.id} />
      </Container>
    </Suspense>
  );

  */
}

"use server";
import getOrderById from "@/actions/get-order-by_id";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { getAbsoluteUrl } from "@/lib/utils";
import type { StoreOrder } from "@/types";
import { OrderStatus, PaymentStatus } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Stripe from "stripe";

// this page is hit when stripe element confirmed the payment.
// here we mark the order as paid, show customer a message and redirect to account page.
export default async function LinePayConfirmedPage({
  params,
  searchParams,
}: {
  params: { orderId: string };
  searchParams: {
    payment_intent: string;
    payment_intent_client_secret: string;
  };
}) {
  if (!params.orderId) {
    throw new Error("order Id is missing");
  }



  // call confirm api
  const order = (await getOrderById(params.orderId)) as StoreOrder;


  //redirect(`${getAbsoluteUrl()}/checkout/${order.id}/linepay/success`);

  return (
    <Suspense fallback={<Loader />}>
      <Container>
        <SuccessAndRedirect orderId={order.id} />
      </Container>
    </Suspense>
  );
}

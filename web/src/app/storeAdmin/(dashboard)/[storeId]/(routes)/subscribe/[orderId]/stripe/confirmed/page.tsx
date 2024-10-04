"use server";
import { SuccessAndRedirect } from "@/components/success-and-redirect";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { sqlClient } from "@/lib/prismadb";
import { getAbsoluteUrl } from "@/lib/utils";
import { OrderStatus, PaymentStatus, StoreLevel } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Stripe from "stripe";

// this page is hit when stripe element confirmed the payment.
// here we mark the SubscriptionPayment as paid, show customer a message.
export default async function StripeConfirmedPage({
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

  //http://localhost:3001/payment/52af45f3-12bc-4c6d-967a-b51c980c7b48/stripe/confirm?
  //payment_intent=pi_2OMs29qw2UGRduYS1g2umg13&
  //payment_intent_client_secret=pi_2OMs29qw2UGRduYS1g2umg13_secret_bxm9PFV4eQP7vhHVam5Gf5Y0K
  //&redirect_status=succeeded

  //console.log('orderId: ' + params.orderId);
  //console.log('payment_intent: ' + searchParams.payment_intent);
  //console.log('client_secret: ' + searchParams.payment_intent_client_secret);

  //const payment_intent = searchParams.get('payment_intent');
  //const client_secret = searchParams.get('payment_intent_client_secret');
  if (
    searchParams.payment_intent &&
    searchParams.payment_intent_client_secret
  ) {
    const stripe = new Stripe(
      `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
    );
    const pi = await stripe.paymentIntents.retrieve(
      searchParams.payment_intent,
      {
        client_secret: searchParams.payment_intent_client_secret,
      },
    );

    if (pi) {
/*
      stripe.subscriptions.create({
        customer: pi.customer,
        items: [
          {
            price: pi?.metadata?.priceId,
          },
        ],
      })

*/

      const checkoutAttributes = JSON.stringify({
        payment_intent: searchParams.payment_intent,
        client_secret: searchParams.payment_intent_client_secret,
      });

      const order = await sqlClient.subscriptionPayment.update({
        where: {
          id: params.orderId,
        },
        data: {
          isPaid: true,
          checkoutAttributes: checkoutAttributes,
        },
      });

      // update store's subscription level
      await sqlClient.store.update({
        where: {
          id: order.storeId,
        },
        data: {
          level: StoreLevel.Pro,
        },
      })

      console.log(
        `StripeConfirmedPage: order confirmed: ${JSON.stringify(order)}`,
      );

      //redirect(`${getAbsoluteUrl()}/checkout/${order.id}/stripe/success`);

      return (
        <Suspense fallback={<Loader />}>
          <Container>
          SubscriptionPayment confirmed.
          </Container>
        </Suspense>
      );
    }
  }
}

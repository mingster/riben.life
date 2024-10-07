"use server";
import Container from "@/components/ui/container";
import { Loader } from "@/components/ui/loader";
import { GetSession, IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Stripe from "stripe";
import { SuccessAndRedirect } from "./SuccessAndRedirect";

// this page is triggered when stripe confirmed the payment.
// here we mark the SubscriptionPayment as paid, activate the subscription, and show customer a message.
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

  if (
    searchParams.payment_intent &&
    searchParams.payment_intent_client_secret
  ) {
    const stripePi = new Stripe(
      `${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}`,
    );
    const pi = await stripePi.paymentIntents.retrieve(
      searchParams.payment_intent,
      {
        client_secret: searchParams.payment_intent_client_secret,
      },
    );

    if (pi) {
      // save checkout references to related subscriptionPayment in db
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

      const store = await sqlClient.store.findUnique({
        where: {
          id: order.storeId,
        },
      });
      if (!store) throw Error("store not found");

      // update subscription object in our database
      //

      let currentDate = new Date(); // Current date and time

      const subscription = await sqlClient.subscription.findUnique({
        where: {
          storeId: store.id,
        },
      });
      if (subscription) {
        currentDate = subscription.expiration;
      }

      await sqlClient.subscription.update({
        where: {
          storeId: store.id,
        },
        data: {
          status: SubscriptionStatus.Active,
          expiration: new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            currentDate.getDay(),
            23,
            59,
            59,
          ),
        },
      });

      // finally update store's subscription level
      // if more than one store, save as StoreLevel.Multi
      /*
      const count = await sqlClient.store.count({
        where: {
          ownerId: store?.ownerId,
        },
      });
      */

      await sqlClient.store.update({
        where: {
          id: order.storeId,
        },
        data: {
          level: StoreLevel.Pro,
          //level: count === 1 ? StoreLevel.Pro : StoreLevel.Multi,
        },
      });

      console.log(
        `StripeConfirmedPage: order confirmed: ${JSON.stringify(order)}`,
      );

      return (
        <Suspense fallback={<Loader />}>
          <Container>
            <SuccessAndRedirect orderId={order.id} />
          </Container>
        </Suspense>
      );
    }
  }
}

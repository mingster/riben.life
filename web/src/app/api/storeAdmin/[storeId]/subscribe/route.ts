import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminAccess } from "../../api_helper";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { IsSignInResponse } from "@/lib/auth/utils";
import { stripe } from "@/lib/stripe/config";
import { SubscriptionStatus } from "@/types/enum";

// called when store operator select a package to subscribe.
// create object for store level up subscription
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } },
) {
  try {
    CheckStoreAdminAccess(params.storeId);
    const userId = await IsSignInResponse();
    if (typeof userId !== "string") {
      return new NextResponse("Unauthenticated", { status: 400 });
    }

    const owner = await sqlClient.user.findFirst({
      where: {
        id: userId,
      },
    });

    if (!owner) throw Error("owner not found");

    // Ensure stripeCustomerId is a valid string before retrieving the customer
    let stripeCustomer = null;
    if (owner?.stripeCustomerId) {
      try {
        stripeCustomer = await stripe.customers.retrieve(owner.stripeCustomerId);
      }
      catch (error) {
        stripeCustomer = null;
      }
    }

    if (stripeCustomer === null) {
      const email = `${owner?.email}`;

      stripeCustomer = await stripe.customers
        .create({
          email: email,
          name: email,
        });

      await sqlClient.user.update({
        where: { id: owner?.id },
        data: {
          stripeCustomerId: stripeCustomer.id,
        },
      })
    }
    // create awaiting to be paid stripe subscription
    /*
    const stripeSubscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [
        {
          plan: "price_1Q6ZsCRqaK2IhyxPXaDqZbjr",
        },
      ],
      collection_method: "charge_automatically",
      cancel_at_period_end: false,
      //start_date: currentDate,
      //current_period_start: currentDate,
      currency: "twd",
      payment_settings: { payment_method_types: ['card',], save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      //payment_behavior: "default_incomplete",
      payment_behavior: "allow_incomplete",
      //payment_behavior: "pending_if_incomplete", //only used with updates and cannot be passed when creating a Subscription.
    });
    */

    const subscriptionSchedule = await stripe.subscriptionSchedules.create({
      customer: stripeCustomer.id,
      start_date: 'now',
      end_behavior: 'release',
      phases: [
        {
          items: [
            {
              price: 'price_1Q6ZsCRqaK2IhyxPXaDqZbjr',
              quantity: 1,
            },
          ],
        },
      ],
    });

    //if (store.level === StoreLevel.Free) {
    const currentDate = new Date(); // Current date and time

    const subscription = await sqlClient.subscription.findUnique({
      where: {
        storeId: params.storeId,
      },
    })

    if (!subscription) {
      await sqlClient.subscription.create({
        data: {
          userId: owner.id,
          storeId: params.storeId,
          expiration: currentDate,
          status: SubscriptionStatus.Inactive,
          billingProvider: "stripe",
          stripeSubscriptionId: subscriptionSchedule.id,
          note: "",
        },
      });
    }

    const obj = await sqlClient.subscriptionPayment.create({
      data: {
        storeId: params.storeId,
        userId: owner.stripeCustomerId || '',
        isPaid: false,
        amount: 300,
        currency: "twd",
      },
    });

    return NextResponse.json(obj, { status: 200 });

  } catch (error) {
    console.log("[SubscriptionPayment_POST]", error);
    return new NextResponse(`Internal error${error}`, { status: 500 });
  }
}

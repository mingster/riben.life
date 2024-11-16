import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { transformDecimalsToNumbers } from "@/lib/utils";
import { getUtcNow } from "@/lib/utils";
import { SubscriptionStatus } from "@/types/enum";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

// called when store operator select a package to subscribe.
// create db objects needed in this call.
export async function POST(
  req: Request,
  props: { params: Promise<{ storeId: string }> },
) {
  const params = await props.params;
  try {
    CheckStoreAdminApiAccess(params.storeId);
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
        stripeCustomer = await stripe.customers.retrieve(
          owner.stripeCustomerId,
        );
      } catch (error) {
        stripeCustomer = null;
      }
    }

    if (stripeCustomer === null) {
      const email = `${owner?.email}`;

      stripeCustomer = await stripe.customers.create({
        email: email,
        name: email,
      });

      await sqlClient.user.update({
        where: { id: owner?.id },
        data: {
          stripeCustomerId: stripeCustomer.id,
        },
      });
    }

    // TODO: should we check?
    //if (store.level === StoreLevel.Free) {}

    const subscriptionSchedule = await stripe.subscriptionSchedules.create({
      customer: stripeCustomer.id,
      start_date: "now",
      end_behavior: "release",
      phases: [
        {
          items: [
            {
              price: "price_1Q6ZsCRqaK2IhyxPXaDqZbjr",
              quantity: 1,
            },
          ],
        },
      ],
    });

    // make sure we have the subscription record only.
    // activate the subscription only when payment is confirmed.
    //
    const currentDate = getUtcNow(); // Current date and time
    await sqlClient.subscription.upsert({
      where: {
        storeId: params.storeId,
      },
      update: {
        userId: owner.id,
        storeId: params.storeId,
        expiration: currentDate,
        status: SubscriptionStatus.Inactive,
        billingProvider: "stripe",
        stripeSubscriptionId: subscriptionSchedule.id,
        note: "re-subscribed",
      },
      create: {
        userId: owner.id,
        storeId: params.storeId,
        expiration: currentDate,
        status: SubscriptionStatus.Inactive,
        billingProvider: "stripe",
        stripeSubscriptionId: subscriptionSchedule.id,
        note: "subscribe",
      },
    });

    const obj = await sqlClient.subscriptionPayment.create({
      data: {
        storeId: params.storeId,
        userId: owner.stripeCustomerId || "",
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

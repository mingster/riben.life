import { IsSignInResponse } from "@/lib/auth/utils";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { getUtcNow } from "@/utils/datetime-utils";
import { NextResponse } from "next/server";

export async function GET(
	_req: Request,
	_props: { params: Promise<{ storeId: string }> },
) {
	return new NextResponse("Subscription not found", { status: 404 });
}

// called when store operator select the free package (StoreLevel.Free).
// or from admin store mgmt page.
// we will:
// 1. call stripe api to cancel subscriptionSchedule.
// 2. update store level to free.
// 3. update store subscription
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		const userId = await IsSignInResponse();
		if (typeof userId !== "string") {
			return new NextResponse("Unauthenticated", { status: 400 });
		}

		const store = await sqlClient.store.findFirst({
			where: {
				id: params.storeId,
			},
		});

		if (!store) {
			return new NextResponse("store not found", { status: 402 });
		}

		/*
    if (store.ownerId !== userId) {
      return new NextResponse("Unauthenticated", { status: 401 });
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

    }
    */

		const subscription = await sqlClient.subscription.findUnique({
			where: {
				storeId: params.storeId,
			},
		});

		if (subscription?.subscriptionId) {
			try {
				const subscriptionSchedule = subscription?.subscriptionId
					? await stripe.subscriptionSchedules.retrieve(
							subscription.subscriptionId,
						)
					: null;

				if (subscriptionSchedule) {
					await stripe.subscriptionSchedules.cancel(subscriptionSchedule.id);

					if (
						subscriptionSchedule?.subscription &&
						typeof subscriptionSchedule.subscription !== "string"
					) {
						await stripe.subscriptions.cancel(
							subscriptionSchedule.subscription.id,
						);
					}

					// update subscription in database
					await sqlClient.subscription.update({
						where: {
							storeId: params.storeId,
						},
						data: {
							subscriptionId: null,
							status: SubscriptionStatus.Cancelled,
							note: `Unsubscribed by ${userId}`,
							updatedAt: getUtcNow(),
						},
					});

					await sqlClient.store.update({
						where: {
							id: params.storeId,
						},
						data: {
							level: StoreLevel.Free,
						},
					});
				}
			} catch (error) {
				console.log("[SubscriptionPayment_POST]", error);

				return new NextResponse(`Internal error${error}`, { status: 500 });
			}
		} else {
			// Handle the case where subscription or subscriptionId is null
			return new NextResponse("Subscription not found", { status: 501 });
		}

		return NextResponse.json("ok", { status: 200 });
	} catch (error) {
		console.log("[SubscriptionPayment_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

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
		const access = await CheckStoreAdminApiAccess(params.storeId);
		if (access instanceof NextResponse) {
			return access;
		}
		const session = await auth.api.getSession({
			headers: await headers(), // you need to pass the headers object.
		});
		const userId = session?.user.id;
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

		const subscription = await sqlClient.storeSubscription.findUnique({
			where: {
				storeId: params.storeId,
			},
		});

		if (subscription?.subscriptionId) {
			try {
				const subscriptionSchedule = await stripe.subscriptionSchedules.retrieve(
					subscription.subscriptionId,
				);

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
				}
			} catch (error) {
				logger.error("Unsubscribe: Stripe cancel failed", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
						stack: error instanceof Error ? error.stack : undefined,
						storeId: params.storeId,
						subscriptionId: subscription.subscriptionId,
					},
					tags: ["api", "unsubscribe", "error"],
				});
				return new NextResponse(
					error instanceof Error ? error.message : "Failed to cancel subscription",
					{ status: 500 },
				);
			}
		}

		// Update DB: mark subscription cancelled and store level free (with or without Stripe subscriptionId)
		if (subscription) {
			await sqlClient.storeSubscription.update({
				where: {
					storeId: params.storeId,
				},
				data: {
					subscriptionId: null,
					status: SubscriptionStatus.Cancelled,
					note: `Unsubscribed by ${userId}`,
					updatedAt: getUtcNowEpoch(),
				},
			});
		}

		await sqlClient.store.update({
			where: {
				id: params.storeId,
			},
			data: {
				level: StoreLevel.Free,
			},
		});

		return NextResponse.json("ok", { status: 200 });
	} catch (error) {
		logger.error("Unsubscribe API failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				storeId: params.storeId,
			},
			tags: ["api", "unsubscribe", "error"],
		});
		return new NextResponse(
			error instanceof Error ? error.message : "Internal server error",
			{ status: 500 },
		);
	}
}

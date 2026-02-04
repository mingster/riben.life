import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { SubscriptionStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

// called when store operator select a package to subscribe.
// here we create db objects needed for payment intent confirmation.
// 1. make sure the customer has valid stripeCustomerId
// 2. create subscription db record
// 3. create subscription payment
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

		// 1. make sure we have valid stripeCustomerId
		//
		let owner = await sqlClient.user.findFirst({
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
				logger.error(`Error retrieving Stripe customer: ${error}`);

				stripeCustomer = null;
			}
		}

		if (stripeCustomer === null) {
			const email = `${owner?.email}`;

			stripeCustomer = await stripe.customers.create({
				email: email,
				name: email,
			});

			owner = await sqlClient.user.update({
				where: { id: owner?.id },
				data: {
					stripeCustomerId: stripeCustomer.id,
				},
			});
		}

		// 2. make sure we have valid subscription record for confirmation process
		//
		const new_expiration = getUtcNowEpoch(); // default to now

		// make sure we have the subscription record only.
		// activate the subscription only when payment is confirmed.
		//
		await sqlClient.storeSubscription.upsert({
			where: {
				storeId: params.storeId,
			},
			update: {
				userId: owner.id,
				storeId: params.storeId,
				expiration: new_expiration,
				status: SubscriptionStatus.Inactive,
				billingProvider: "stripe",
				//subscriptionId: subscriptionSchedule.id,
				note: "re-subscribed",
			},
			create: {
				userId: owner.id,
				storeId: params.storeId,
				expiration: new_expiration,
				status: SubscriptionStatus.Inactive,
				billingProvider: "stripe",
				//subscriptionId: subscriptionSchedule.id,
				note: "subscribe",
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		const setting = await sqlClient.platformSettings.findFirst();
		if (setting === null) {
			throw new Error("Platform settings not found");
		}
		if (
			!setting.stripePriceId ||
			typeof setting.stripePriceId !== "string" ||
			setting.stripePriceId.trim() === ""
		) {
			logger.error("Subscribe: stripePriceId not configured", {
				metadata: { storeId: params.storeId },
				tags: ["api", "subscribe"],
			});
			return new NextResponse(
				"Subscription price is not configured. Please contact support.",
				{ status: 503 },
			);
		}

		// 3. create the subscriptionPayment related to this payment intent
		const price = await stripe.prices.retrieve(setting.stripePriceId);

		const stripeCustomerId = owner.stripeCustomerId;
		if (!stripeCustomerId || typeof stripeCustomerId !== "string") {
			logger.error("Subscribe: stripeCustomerId missing after setup", {
				metadata: { storeId: params.storeId, userId: owner.id },
				tags: ["api", "subscribe"],
			});
			return new NextResponse(
				"Payment account could not be prepared. Please try again.",
				{ status: 500 },
			);
		}

		const obj = await sqlClient.subscriptionPayment.create({
			data: {
				storeId: params.storeId,
				userId: stripeCustomerId,
				isPaid: false,
				amount: (price.unit_amount as number) / 100,
				currency: price.currency as string,
				createdAt: getUtcNowEpoch(),
			},
		});

		// 4. return the subscription payment object
		//
		transformPrismaDataForJson(obj);
		return NextResponse.json(obj, { status: 200 });
	} catch (error) {
		logger.error("Subscribe API failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				storeId: params.storeId,
			},
			tags: ["api", "subscribe", "error"],
		});

		return new NextResponse(
			error instanceof Error ? error.message : "Internal server error",
			{ status: 500 },
		);
	}
}

import { IsSignInResponse } from "@/lib/auth/utils";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/stripe/config";
import { getUtcNow, transformDecimalsToNumbers } from "@/lib/utils";
import { SubscriptionStatus } from "@/types/enum";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";

// called when store operator select a package to subscribe.
// here we create db objects needed for payment intent confirmation.
export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);
		const userId = await IsSignInResponse();
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
		const new_expiration = getUtcNow(); // default to now

		// make sure we have the subscription record only.
		// activate the subscription only when payment is confirmed.
		//
		await sqlClient.subscription.upsert({
			where: {
				storeId: params.storeId,
			},
			update: {
				userId: owner.id,
				storeId: params.storeId,
				expiration: new_expiration,
				status: SubscriptionStatus.Inactive,
				billingProvider: "stripe",
				//stripeSubscriptionId: subscriptionSchedule.id,
				note: "re-subscribed",
			},
			create: {
				userId: owner.id,
				storeId: params.storeId,
				expiration: new_expiration,
				status: SubscriptionStatus.Inactive,
				billingProvider: "stripe",
				//stripeSubscriptionId: subscriptionSchedule.id,
				note: "subscribe",
			},
		});

		const setting = await sqlClient.platformSettings.findFirst();
		if (setting === null) {
			throw new Error("Platform settings not found");
		}

		// 3. create the subscriptionPayment related to this payment intent
		const price = await stripe.prices.retrieve(setting.stripePriceId as string);

		const obj = await sqlClient.subscriptionPayment.create({
			data: {
				storeId: params.storeId,
				userId: owner.stripeCustomerId || "",
				isPaid: false,
				amount: (price.unit_amount as number) / 100,
				currency: price.currency as string,
			},
		});

		// 4. return the subscription payment object
		//
		return NextResponse.json(obj, { status: 200 });
	} catch (error) {
		console.log("[SubscriptionPayment_POST]", error);

		return new NextResponse(`Internal error${error}`, { status: 500 });
	}
}

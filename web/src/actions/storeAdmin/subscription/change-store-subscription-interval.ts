"use server";

import { stripePlugin } from "@/lib/payment/plugins/stripe-plugin";
import { sqlClient } from "@/lib/prismadb";
import { stripe } from "@/lib/payment/stripe/config";
import { getStripeSubscriptionPeriodEndUnix } from "@/lib/payment/stripe/subscription-period-end";
import {
	groupSubscriptionPrices,
	tierKeyFromStoreLevel,
} from "@/lib/subscription/resolve-product-prices";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { changeStoreSubscriptionIntervalSchema } from "./change-store-subscription-interval.validation";

export const changeStoreSubscriptionIntervalAction = storeActionClient
	.metadata({ name: "changeStoreSubscriptionInterval" })
	.schema(changeStoreSubscriptionIntervalSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { targetInterval } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { level: true },
		});
		if (store?.level !== StoreLevel.Pro && store?.level !== StoreLevel.Multi) {
			throw new SafeError("Store is not on a paid plan");
		}

		const tierKey = tierKeyFromStoreLevel(store.level);
		if (!tierKey) {
			throw new SafeError("Invalid store tier");
		}

		const subRow = await sqlClient.storeSubscription.findUnique({
			where: { storeId },
		});
		if (!subRow?.subscriptionId) {
			throw new SafeError("No Stripe subscription on file");
		}

		const setting = await sqlClient.platformSettings.findFirst();
		const productId = setting?.stripeProductId?.trim();
		if (!productId) {
			throw new SafeError("Platform subscription product is not configured");
		}

		const pricesRes = await stripe.prices.list({
			product: productId,
			active: true,
			limit: 100,
		});
		const grouped = groupSubscriptionPrices(pricesRes.data, {
			productId,
			legacyStripePriceId: setting?.stripePriceId ?? null,
		});
		const targetPrice = grouped[tierKey][targetInterval];
		if (!targetPrice?.id) {
			throw new SafeError(
				`No Stripe price for this plan and ${targetInterval}ly billing`,
			);
		}

		const stripeSub = await stripe.subscriptions.retrieve(
			subRow.subscriptionId,
			{
				expand: ["items.data.price"],
			},
		);

		const metaStoreId = stripeSub.metadata?.store_id;
		if (metaStoreId !== storeId) {
			throw new SafeError("Subscription does not belong to this store");
		}

		const item = stripeSub.items.data[0];
		if (!item?.id) {
			throw new SafeError("Subscription has no line items");
		}

		const currentPriceId =
			typeof item.price === "string" ? item.price : item.price?.id;
		if (currentPriceId === targetPrice.id) {
			throw new SafeError("Already on this billing interval");
		}

		const updated =
			await stripePlugin.changeStoreBillingSubscriptionIntervalWithUnusedRefund(
				{
					subscriptionId: stripeSub.id,
					subscriptionItemId: item.id,
					newPriceId: targetPrice.id,
					storeId,
				},
			);

		const periodEndSec = getStripeSubscriptionPeriodEndUnix(updated);
		if (periodEndSec === null) {
			throw new SafeError("Stripe subscription missing period end");
		}
		const expiration = BigInt(periodEndSec * 1000);

		await sqlClient.storeSubscription.update({
			where: { storeId },
			data: {
				expiration,
				status: SubscriptionStatus.Active,
				subscriptionId: updated.id,
				updatedAt: getUtcNowEpoch(),
				note: `Billing interval set to ${targetInterval}`,
			},
		});

		return { success: true as const, expiration: Number(expiration) };
	});

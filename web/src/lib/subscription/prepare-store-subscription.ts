import logger from "@/lib/logger";
import { SubscriptionBillingNotSupportedError } from "@/lib/payment/plugins/subscription-billing-error";
import { getPlatformSubscriptionBillingGateway } from "@/lib/payment/plugins/subscription-gateway-registry";
import { stripe } from "@/lib/payment/stripe/config";
import {
	internalMinorMatchesLegacySubscriptionPaymentStored,
	internalMinorToStripeUnit,
	minStripeUnitsForSubscriptionSanityCheck,
	normalizeStripeCurrency,
	resolveStripePriceBillingUnit,
	stripeUnitToInternalMinor,
} from "@/lib/payment/stripe/stripe-money";
import { sqlClient } from "@/lib/prismadb";
import { resolveTierForSubscriptionPrice } from "@/lib/subscription/resolve-product-prices";
import { SubscriptionStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

export interface PrepareStoreSubscriptionResult {
	subscriptionPayment: Record<string, unknown>;
	stripeCustomerId: string;
	amount: number;
	currency: string;
	interval: string | null;
	productName: string | null;
	targetStoreLevel: number;
	stripePriceId: string;
}

function normalizeStripeProductId(
	product: string | { id: string } | null | undefined,
): string | null {
	if (typeof product === "string") return product;
	if (product && typeof product === "object" && "id" in product) {
		return product.id;
	}
	return null;
}

/**
 * Ensures Stripe customer, store subscription row, and a pending {@link SubscriptionPayment}.
 * Reuses an unpaid payment for this store and user when amount, currency, and target tier match.
 */
export async function prepareStoreSubscription(input: {
	storeId: string;
	userId: string;
	stripePriceId: string;
}): Promise<PrepareStoreSubscriptionResult> {
	const { storeId, userId, stripePriceId } = input;

	if (!stripePriceId?.trim()) {
		throw new Error("stripePriceId is required");
	}

	const subscriptionBilling = getPlatformSubscriptionBillingGateway();
	if (subscriptionBilling.subscriptionBillingGatewayId !== "stripe") {
		throw new SubscriptionBillingNotSupportedError(
			subscriptionBilling.subscriptionBillingGatewayId,
		);
	}

	let owner = await sqlClient.user.findFirst({
		where: { id: userId },
	});

	if (!owner) {
		throw new Error("owner not found");
	}

	let stripeCustomer: Awaited<
		ReturnType<typeof stripe.customers.retrieve>
	> | null = null;
	if (owner.stripeCustomerId) {
		try {
			const retrieved = await stripe.customers.retrieve(owner.stripeCustomerId);
			if ("deleted" in retrieved && retrieved.deleted) {
				stripeCustomer = null;
			} else {
				stripeCustomer = retrieved;
			}
		} catch (err: unknown) {
			logger.error("Error retrieving Stripe customer", {
				metadata: {
					error: err instanceof Error ? err.message : String(err),
				},
				tags: ["stripe", "subscription"],
			});
			stripeCustomer = null;
		}
	}

	if (stripeCustomer === null) {
		const email = `${owner.email}`;
		stripeCustomer = await stripe.customers.create({
			email,
			name: email,
		});

		owner = await sqlClient.user.update({
			where: { id: owner.id },
			data: { stripeCustomerId: stripeCustomer.id },
		});
	}

	const stripeCustomerId = owner.stripeCustomerId;
	if (!stripeCustomerId || typeof stripeCustomerId !== "string") {
		throw new Error("stripeCustomerId missing after customer setup");
	}

	const new_expiration = getUtcNowEpoch();

	await sqlClient.storeSubscription.upsert({
		where: { storeId },
		update: {
			userId: owner.id,
			storeId,
			// Preserve expiration until confirm-payment / Stripe webhooks set the real period end.
			status: SubscriptionStatus.Inactive,
			billingProvider: "stripe",
			note: "re-subscribed",
		},
		create: {
			userId: owner.id,
			storeId,
			expiration: new_expiration,
			status: SubscriptionStatus.Inactive,
			billingProvider: "stripe",
			note: "subscribe",
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
		},
	});

	const setting = await sqlClient.platformSettings.findFirst();
	if (setting === null) {
		throw new Error("Platform settings not found");
	}

	const price = await stripe.prices.retrieve(stripePriceId.trim(), {
		expand: ["product"],
	});

	const priceProductId = normalizeStripeProductId(price.product);
	const platformProductId = setting.stripeProductId?.trim() || null;
	const legacyPriceId = setting.stripePriceId?.trim() || null;

	if (platformProductId) {
		if (priceProductId !== platformProductId) {
			logger.error("prepareStoreSubscription: price product mismatch", {
				metadata: {
					storeId,
					priceProductId,
					platformProductId,
				},
				tags: ["subscription"],
			});
			throw new Error(
				"Selected price does not belong to the platform subscription product.",
			);
		}
	} else if (legacyPriceId) {
		if (price.id !== legacyPriceId) {
			throw new Error(
				"Subscription price is not configured for this platform. Please contact support.",
			);
		}
	} else {
		logger.error(
			"prepareStoreSubscription: no stripeProductId or stripePriceId",
			{
				metadata: { storeId },
				tags: ["subscription"],
			},
		);
		throw new Error(
			"Subscription pricing is not configured. Please contact support.",
		);
	}

	const { storeLevel: targetStoreLevel } = resolveTierForSubscriptionPrice(
		price,
		legacyPriceId,
	);

	const storeRow = await sqlClient.store.findFirst({
		where: { id: storeId },
		select: { defaultCurrency: true },
	});
	const presentment =
		typeof storeRow?.defaultCurrency === "string" &&
		storeRow.defaultCurrency.trim() !== ""
			? storeRow.defaultCurrency
			: "twd";
	const { currency, unitAmount } = resolveStripePriceBillingUnit(
		price,
		presentment,
	);
	if (unitAmount == null || unitAmount <= 0) {
		throw new Error(
			`This subscription price has no amount for the store currency (${normalizeStripeCurrency(presentment).toUpperCase()}). In Stripe, add that currency on the Price (currency_options) or set the store default currency to match the Price.`,
		);
	}
	const amountInternalMinor = stripeUnitToInternalMinor(currency, unitAmount);
	const stripeChargeUnits = internalMinorToStripeUnit(
		currency,
		amountInternalMinor,
	);
	// Stripe minimum is ~USD 0.50; tiny amounts usually mean a misconfigured Price.
	const minStripeUnits = minStripeUnitsForSubscriptionSanityCheck(currency);
	if (stripeChargeUnits < minStripeUnits) {
		throw new Error(
			`Subscription price amount is too small to charge (${stripeChargeUnits} ${normalizeStripeCurrency(currency).toUpperCase()} Stripe units). For TWD use subunits like USD (NT$330 → 33000, not 330). For JPY/KRW zero-decimal majors, see STRIPE_ZERO_DECIMAL_CURRENCIES in stripe-money.ts.`,
		);
	}

	const existingUnpaid = await sqlClient.subscriptionPayment.findFirst({
		where: {
			storeId,
			userId: owner.id,
			isPaid: false,
		},
		orderBy: { createdAt: "desc" },
	});

	let subscriptionPayment = existingUnpaid;

	if (
		subscriptionPayment &&
		(!internalMinorMatchesLegacySubscriptionPaymentStored(
			Number(subscriptionPayment.amount),
			amountInternalMinor,
		) ||
			normalizeStripeCurrency(String(subscriptionPayment.currency ?? "")) !==
				currency ||
			subscriptionPayment.targetStoreLevel !== targetStoreLevel ||
			(subscriptionPayment.stripePriceId ?? "") !== price.id)
	) {
		subscriptionPayment = null;
	}

	if (!subscriptionPayment) {
		subscriptionPayment = await sqlClient.subscriptionPayment.create({
			data: {
				storeId,
				userId: owner.id,
				isPaid: false,
				amount: amountInternalMinor,
				currency,
				targetStoreLevel,
				stripePriceId: price.id,
				createdAt: getUtcNowEpoch(),
			},
		});
	}

	const spPlain = { ...subscriptionPayment } as Record<string, unknown>;
	transformPrismaDataForJson(spPlain);

	let productName: string | null = null;
	if (price.product && typeof price.product !== "string") {
		productName =
			"name" in price.product ? (price.product.name as string) : null;
	}

	const interval =
		price.recurring?.interval != null ? String(price.recurring.interval) : null;

	return {
		subscriptionPayment: spPlain,
		stripeCustomerId,
		amount: amountInternalMinor,
		currency,
		interval,
		productName,
		targetStoreLevel,
		stripePriceId: price.id,
	};
}

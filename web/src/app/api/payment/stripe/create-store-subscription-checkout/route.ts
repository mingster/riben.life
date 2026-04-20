import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { getSubscriptionBillingPlugin } from "@/lib/payment/plugins/subscription-gateway-registry";
import { stripe } from "@/lib/payment/stripe/config";
import { sqlClient } from "@/lib/prismadb";

function parseCheckoutAttrs(raw: string): Record<string, unknown> {
	if (!raw?.trim()) {
		return {};
	}
	try {
		const o = JSON.parse(raw) as unknown;
		return typeof o === "object" && o !== null && !Array.isArray(o)
			? (o as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function mergeCheckoutAttrs(
	existingRaw: string,
	patch: Record<string, unknown>,
): string {
	return JSON.stringify({ ...parseCheckoutAttrs(existingRaw), ...patch });
}

/**
 * Starts platform store subscription checkout with Stripe’s subscription + Elements flow:
 * `subscriptions.create` with `payment_behavior: default_incomplete`, returns the **invoice**
 * `client_secret` (confirmation_secret or PaymentIntent). One `confirmPayment` completes the
 * first invoice — no separate standalone PI + second `subscriptions.create`.
 */
export async function POST(req: Request) {
	try {
		let body: { storeId?: string; subscriptionPaymentId?: string };
		try {
			body = (await req.json()) as typeof body;
		} catch {
			return NextResponse.json(
				{ message: "Invalid JSON body" },
				{ status: 400 },
			);
		}

		const storeId = typeof body.storeId === "string" ? body.storeId.trim() : "";
		const subscriptionPaymentId =
			typeof body.subscriptionPaymentId === "string"
				? body.subscriptionPaymentId.trim()
				: "";

		if (!storeId || !subscriptionPaymentId) {
			return NextResponse.json(
				{ message: "storeId and subscriptionPaymentId are required" },
				{ status: 400 },
			);
		}

		const access = await CheckStoreAdminApiAccess(storeId);
		if (access instanceof NextResponse) {
			return access;
		}

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const userId = session?.user?.id;
		if (typeof userId !== "string") {
			return NextResponse.json({ message: "Unauthenticated" }, { status: 400 });
		}

		const plugin = getSubscriptionBillingPlugin("stripe");
		if (!plugin) {
			logger.error("Stripe subscription billing plugin missing from registry", {
				tags: ["payment", "stripe", "error", "api"],
			});
			return NextResponse.json(
				{
					message: "Payment service is not configured. Please try again later.",
				},
				{ status: 500 },
			);
		}

		const payment = await sqlClient.subscriptionPayment.findUnique({
			where: { id: subscriptionPaymentId },
		});

		if (!payment) {
			return NextResponse.json(
				{ message: "Subscription payment not found" },
				{ status: 404 },
			);
		}
		if (payment.storeId !== storeId) {
			return NextResponse.json({ message: "Store mismatch" }, { status: 403 });
		}
		if (payment.userId !== userId) {
			return NextResponse.json({ message: "Forbidden" }, { status: 403 });
		}
		if (payment.isPaid) {
			return NextResponse.json(
				{ message: "This checkout is already completed." },
				{ status: 400 },
			);
		}

		const stripePriceId = payment.stripePriceId?.trim();
		if (!stripePriceId) {
			return NextResponse.json(
				{ message: "Subscription payment is missing stripePriceId" },
				{ status: 400 },
			);
		}

		const owner = await sqlClient.user.findUnique({ where: { id: userId } });
		const stripeCustomerId = owner?.stripeCustomerId?.trim();
		if (!stripeCustomerId) {
			return NextResponse.json(
				{ message: "Stripe customer is not set up for this account." },
				{ status: 400 },
			);
		}

		const attrs = parseCheckoutAttrs(payment.checkoutAttributes);
		const pendingSubId =
			typeof attrs.pending_stripe_subscription_id === "string"
				? attrs.pending_stripe_subscription_id.trim()
				: "";
		/** Snapshot: parallel POSTs must share one Stripe idempotency key until a pending sub exists. */
		const hadNoPendingStripeSubscription = pendingSubId === "";
		let prevGen =
			typeof attrs.subscription_checkout_gen === "number" &&
			Number.isFinite(attrs.subscription_checkout_gen)
				? attrs.subscription_checkout_gen
				: 0;

		if (pendingSubId) {
			try {
				const existing = await stripe.subscriptions.retrieve(pendingSubId, {
					expand: ["items.data.price"],
				});

				if (existing.status === "active" || existing.status === "trialing") {
					return NextResponse.json(
						{
							message:
								"Subscription is already active. Refresh the page to see your plan.",
						},
						{ status: 409 },
					);
				}

				const terminal =
					existing.status === "canceled" ||
					existing.status === "incomplete_expired";

				if (!terminal && existing.status === "incomplete") {
					const metaPay =
						existing.metadata?.subscription_payment_id?.trim() ?? "";
					const metaStore = existing.metadata?.store_id?.trim() ?? "";
					const priceObj = existing.items.data[0]?.price as
						| string
						| Stripe.Price
						| undefined;
					const itemPrice =
						typeof priceObj === "string"
							? priceObj.trim()
							: typeof priceObj?.id === "string"
								? priceObj.id.trim()
								: "";
					const okMeta = metaPay === payment.id && metaStore === storeId;
					const okPrice = itemPrice === stripePriceId;

					if (okMeta && okPrice) {
						const checkout =
							await plugin.getSubscriptionInvoiceCheckoutSecrets(pendingSubId);
						const nextAttrs = mergeCheckoutAttrs(payment.checkoutAttributes, {
							pending_stripe_subscription_id: checkout.subscription.id,
							subscription_checkout_gen: prevGen,
							pending_stripe_invoice_id: checkout.invoiceId,
							pending_stripe_payment_intent_id: checkout.paymentIntentId,
							last_subscription_checkout_at: Date.now(),
						});
						await sqlClient.subscriptionPayment.update({
							where: { id: payment.id },
							data: { checkoutAttributes: nextAttrs },
						});
						return NextResponse.json({
							client_secret: checkout.clientSecret,
							stripe_subscription_id: checkout.subscription.id,
						});
					}
				}
			} catch (err: unknown) {
				logger.warn(
					"Could not reuse pending Stripe subscription; creating new checkout",
					{
						metadata: {
							pendingSubId,
							error: err instanceof Error ? err.message : String(err),
						},
						tags: ["stripe", "subscription", "api"],
					},
				);
			}
		}

		let idempotencyKey: string;
		let nextGen: number;
		if (hadNoPendingStripeSubscription) {
			// Same key for all concurrent "first" attempts → one incomplete subscription in Stripe.
			idempotencyKey = `subpay-${payment.id}-first`;
			nextGen = 1;
		} else {
			prevGen += 1;
			nextGen = prevGen;
			idempotencyKey = `subpay-${payment.id}-g${nextGen}`;
		}

		const result = await plugin.createIncompleteStoreBillingSubscription(
			{
				customerId: stripeCustomerId,
				stripePriceId,
				subscriptionPaymentId: payment.id,
				storeId,
			},
			{ idempotencyKey },
		);

		const nextAttrs = mergeCheckoutAttrs(payment.checkoutAttributes, {
			pending_stripe_subscription_id: result.subscription.id,
			subscription_checkout_gen: nextGen,
			pending_stripe_invoice_id: result.invoiceId,
			pending_stripe_payment_intent_id: result.paymentIntentId,
			last_subscription_checkout_at: Date.now(),
		});
		await sqlClient.subscriptionPayment.update({
			where: { id: payment.id },
			data: { checkoutAttributes: nextAttrs },
		});

		return NextResponse.json({
			client_secret: result.clientSecret,
			stripe_subscription_id: result.subscription.id,
		});
	} catch (error) {
		logger.error("create-store-subscription-checkout failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["payment", "stripe", "error", "api"],
		});
		return NextResponse.json(
			{
				message:
					error instanceof Error
						? error.message
						: "Failed to start subscription checkout.",
			},
			{ status: 500 },
		);
	}
}

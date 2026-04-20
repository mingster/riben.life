import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureStripeCustomer } from "@/actions/user/ensure-stripe-customer";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { getSubscriptionBillingPlugin } from "@/lib/payment/plugins/subscription-gateway-registry";
import { SafeError } from "@/utils/error";

function resolveSetupFutureUsage(
	raw: unknown,
	shouldSavePaymentMethod: boolean,
): "off_session" | "on_session" | undefined {
	if (raw === true || raw === "off_session") {
		return "off_session";
	}
	if (raw === "on_session") {
		return "on_session";
	}
	if (raw === false) {
		return undefined;
	}
	if (shouldSavePaymentMethod) {
		return "off_session";
	}
	return undefined;
}

/**
 * Create Stripe PaymentIntent API route.
 * Used by checkout and credit refill flows to create payment intents.
 *
 * Request Body:
 * - total: number (internal minor = major × 100, e.g. NT$330 → 33000, USD $99.99 → 9999)
 * - currency: string (ISO currency code, e.g., "usd", "twd")
 *
 * Stripe `amount` is derived via `internalMinorToStripeUnit`: **twd** and **usd** use the same integer
 * scale as internal minor for PaymentIntents; **jpy** / other Stripe zero-decimal majors use whole-unit amounts.
 * - stripeCustomerId?: string (optional Stripe customer ID)
 * - orderId?: string (optional order ID for webhook metadata)
 * - storeId?: string (optional store ID for webhook metadata)
 * - savePaymentMethod?: boolean (default true when stripeCustomerId is set) — set false for one-off charges with a customer
 *
 * When `savePaymentMethod` is true and the caller is authenticated, the route resolves the
 * Stripe customer via {@link ensureStripeCustomer} (create if missing, replace if deleted/invalid).
 *
 * `setup_future_usage` on the PaymentIntent is Stripe's enum `"off_session"` or `"on_session"` (not boolean).
 * When saving is enabled (default with a Stripe customer), we set `"off_session"` so the PaymentMethod can be
 * reused for subscriptions/recurring charges. You may also send JSON `setup_future_usage: true` (treated as
 * `"off_session"`) or `"on_session"` / `"off_session"` explicitly.
 *
 * Returns:
 * - Stripe PaymentIntent object with client_secret
 */
export async function POST(req: Request) {
	try {
		const data = await req.json();
		const {
			total,
			currency,
			stripeCustomerId,
			orderId,
			storeId,
			savePaymentMethod,
			setup_future_usage,
		} = data;

		// Validate total
		if (total === undefined || total === null) {
			return NextResponse.json(
				{ success: false, message: "Total is required." },
				{ status: 400 },
			);
		}

		const totalInternal = Math.round(Number(total));
		if (
			typeof total !== "number" ||
			Number.isNaN(total) ||
			!Number.isFinite(totalInternal) ||
			totalInternal <= 0
		) {
			return NextResponse.json(
				{
					success: false,
					message: "Total must be a positive integer (internal minor units).",
				},
				{ status: 400 },
			);
		}

		// Validate currency
		if (!currency || typeof currency !== "string") {
			return NextResponse.json(
				{ success: false, message: "Currency is required." },
				{ status: 400 },
			);
		}

		let customerId =
			typeof stripeCustomerId === "string" && stripeCustomerId.trim() !== ""
				? stripeCustomerId.trim()
				: undefined;

		const wantsSavedPaymentMethod =
			savePaymentMethod === undefined || savePaymentMethod === true;

		if (wantsSavedPaymentMethod) {
			const session = await auth.api.getSession({
				headers: await headers(),
			});
			const userId = session?.user?.id;
			if (typeof userId === "string") {
				try {
					const customer = await ensureStripeCustomer(userId);
					if (customer?.id) {
						customerId = customer.id;
					}
				} catch (err: unknown) {
					if (err instanceof SafeError) {
						return NextResponse.json(
							{ success: false, message: err.message },
							{ status: 400 },
						);
					}
					throw err;
				}
			}
		}

		const shouldSavePaymentMethod =
			Boolean(customerId) && wantsSavedPaymentMethod;

		const setupFutureUsage = resolveSetupFutureUsage(
			setup_future_usage,
			shouldSavePaymentMethod,
		);

		const subscriptionBilling = getSubscriptionBillingPlugin("stripe");
		if (!subscriptionBilling) {
			logger.error("Stripe subscription billing plugin missing from registry", {
				tags: ["payment", "stripe", "error", "api"],
			});
			return NextResponse.json(
				{
					success: false,
					message: "Payment service is not configured. Please try again later.",
				},
				{ status: 500 },
			);
		}

		const paymentIntent = await subscriptionBilling.createCheckoutPaymentIntent(
			{
				amountInternalMinor: totalInternal,
				currency,
				customerId,
				metadata: {
					...(typeof orderId === "string" && orderId ? { orderId } : {}),
					...(typeof storeId === "string" && storeId ? { storeId } : {}),
				},
				...(setupFutureUsage ? { setupFutureUsage } : {}),
			},
		);

		return NextResponse.json(paymentIntent);
	} catch (error) {
		logger.error("Failed to create Stripe payment intent", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["payment", "stripe", "error", "api"],
		});

		return NextResponse.json(
			{
				success: false,
				message: "Failed to create payment intent. Please try again.",
			},
			{ status: 500 },
		);
	}
}

import { stripe } from "@/lib/stripe/config";
import logger from "@/lib/logger";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/**
 * Create Stripe PaymentIntent API route.
 * Used by checkout and credit refill flows to create payment intents.
 *
 * Request Body:
 * - total: number (order total in currency units, e.g., 100.00 for $100)
 * - currency: string (ISO currency code, e.g., "usd", "twd")
 * - stripeCustomerId?: string (optional Stripe customer ID)
 * - orderId?: string (optional order ID for webhook metadata)
 * - storeId?: string (optional store ID for webhook metadata)
 * - savePaymentMethod?: boolean (default true when stripeCustomerId is set) — set false for one-off charges with a customer
 *
 * When `stripeCustomerId` is set and saving is enabled, `setup_future_usage: "off_session"` is set so the
 * PaymentMethod stays attached for subscriptions/recurring charges. Without this, Stripe may treat the PM as
 * single-use and `paymentMethods.attach` after success fails with "may not be used again".
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
		} = data;

		// Validate total
		if (total === undefined || total === null) {
			return NextResponse.json(
				{ success: false, message: "Total is required." },
				{ status: 400 },
			);
		}

		if (typeof total !== "number" || Number.isNaN(total) || total <= 0) {
			return NextResponse.json(
				{ success: false, message: "Total must be a positive number." },
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

		const customerId =
			typeof stripeCustomerId === "string" && stripeCustomerId.trim() !== ""
				? stripeCustomerId.trim()
				: undefined;

		const shouldSavePaymentMethod =
			Boolean(customerId) &&
			(savePaymentMethod === undefined || savePaymentMethod === true);

		const params: Stripe.PaymentIntentCreateParams = {
			...(customerId ? { customer: customerId } : {}),
			amount: Math.round(total * 100), // Smallest currency unit (e.g. cents, or 1/100 TWD)
			currency: currency.toLowerCase(),
			automatic_payment_methods: { enabled: true },
			metadata: {
				...(orderId && { orderId }),
				...(storeId && { storeId }),
			},
		};

		if (shouldSavePaymentMethod) {
			params.setup_future_usage = "off_session"; // to save payment method for future use
		}

		const paymentIntent = await stripe.paymentIntents.create(params);

		logger.info("Stripe payment intent created", {
			metadata: {
				paymentIntentId: paymentIntent.id,
				amount: paymentIntent.amount,
				currency: paymentIntent.currency,
			},
			tags: ["payment", "stripe", "api"],
		});

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

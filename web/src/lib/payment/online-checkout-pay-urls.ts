import { getPaymentPlugin } from "@/lib/payment/plugins";

/**
 * Normalized plugin keys for store checkout (Stripe, LINE Pay, PayPal).
 * Must match installed {@link getPaymentPlugin} identifiers.
 */
const CHECKOUT_ELIGIBLE_PLUGIN_IDS = [
	"stripe",
	"linepay",
	"paypal",
	"newebpay",
] as const;

/**
 * Whether this {@link PaymentMethod.payUrl} can be used for unpaid order checkout
 * (same gate as `/checkout/[orderId]`).
 */
export function isCheckoutEligiblePayUrl(
	payUrl: string | null | undefined,
): boolean {
	if (!payUrl || typeof payUrl !== "string") {
		return false;
	}
	const trimmed = payUrl.trim();
	if (trimmed === "TBD") {
		return false;
	}
	const key = trimmed.toLowerCase();
	if (!(CHECKOUT_ELIGIBLE_PLUGIN_IDS as readonly string[]).includes(key)) {
		return false;
	}
	return getPaymentPlugin(key) !== undefined;
}

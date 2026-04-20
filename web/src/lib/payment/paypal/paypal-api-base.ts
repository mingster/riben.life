/**
 * PayPal REST API base URL (Orders v2, OAuth).
 * Set PAYPAL_USE_SANDBOX=true for sandbox credentials.
 */
export function getPayPalApiBase(): string {
	if (
		process.env.PAYPAL_USE_SANDBOX === "true" ||
		process.env.PAYPAL_USE_SANDBOX === "1"
	) {
		return "https://api-m.sandbox.paypal.com";
	}
	return "https://api-m.paypal.com";
}

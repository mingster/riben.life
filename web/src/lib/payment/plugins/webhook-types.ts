/**
 * Payment webhook handlers for providers that receive HTTP callbacks (e.g. LINE Pay IPN).
 * Stripe shop + platform webhooks use the unified flow in `@/lib/payment/stripe/handle-stripe-webhook`.
 */
export interface PaymentWebhookHandler {
	readonly providerId: string;

	/**
	 * Process a verified or raw webhook request for this provider.
	 * Implementations may verify signatures internally if needed.
	 */
	handlePost(req: Request): Promise<Response>;
}

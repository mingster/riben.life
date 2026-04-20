import type { PaymentWebhookHandler } from "./webhook-types";

class PaymentWebhookRegistry {
	private handlers = new Map<string, PaymentWebhookHandler>();

	register(handler: PaymentWebhookHandler): void {
		const id = handler.providerId.toLowerCase();
		if (this.handlers.has(id)) {
			throw new Error(`Payment webhook handler "${id}" is already registered`);
		}
		this.handlers.set(id, handler);
	}

	get(providerId: string): PaymentWebhookHandler | undefined {
		return this.handlers.get(providerId.toLowerCase());
	}

	has(providerId: string): boolean {
		return this.handlers.has(providerId.toLowerCase());
	}
}

export const paymentWebhookRegistry = new PaymentWebhookRegistry();

export function registerPaymentWebhookHandler(
	handler: PaymentWebhookHandler,
): void {
	paymentWebhookRegistry.register(handler);
}

export function getPaymentWebhookHandler(
	providerId: string,
): PaymentWebhookHandler | undefined {
	return paymentWebhookRegistry.get(providerId);
}

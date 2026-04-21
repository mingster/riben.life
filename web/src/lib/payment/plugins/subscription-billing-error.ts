/**
 * Thrown when a payment gateway does not implement platform subscription billing.
 */
export class SubscriptionBillingNotSupportedError extends Error {
	readonly gatewayId: string;

	constructor(gatewayId: string) {
		super(
			`Subscription billing is not supported for payment gateway "${gatewayId}". Use stripe for platform store subscriptions.`,
		);
		this.name = "SubscriptionBillingNotSupportedError";
		this.gatewayId = gatewayId;
	}
}

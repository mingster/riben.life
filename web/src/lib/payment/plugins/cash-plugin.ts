import type {
	PaymentMethodPlugin,
	PaymentResult,
	PaymentConfirmation,
	PaymentStatus,
	FeeStructure,
	PluginConfig,
	ValidationResult,
	AvailabilityResult,
	PaymentData,
} from "./types";
import type { StoreOrder } from "@prisma/client";

/**
 * Cash/In-Person Payment Method Plugin
 *
 * Implements payment processing for cash or in-person transactions.
 * Payment confirmation can be immediate or manual (by store staff).
 * Zero processing fees.
 */
export class CashPlugin implements PaymentMethodPlugin {
	readonly identifier = "cash";
	readonly name = "Cash/In-Person";
	readonly description = "Cash or in-person payments at store location (現金)";
	readonly version = "1.0.0";

	async processPayment(
		order: StoreOrder,
		config: PluginConfig,
	): Promise<PaymentResult> {
		// Cash payments are processed immediately (no external gateway)
		// Payment can be marked as paid immediately or require manual confirmation
		// The actual payment confirmation is handled by confirmPayment or manual admin action

		const immediateConfirmation =
			config.storeConfig?.immediateConfirmation ?? false;

		return {
			success: true,
			// If immediate confirmation is enabled, payment is confirmed in confirmPayment
			// Otherwise, payment remains pending until store staff confirms manually
		};
	}

	async confirmPayment(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentConfirmation> {
		// Cash payment confirmation
		// If immediateConfirmation is enabled, payment is confirmed immediately
		// Otherwise, this method is called when store staff manually confirms payment

		const immediateConfirmation =
			config.storeConfig?.immediateConfirmation ?? false;

		if (immediateConfirmation) {
			// Payment is confirmed immediately upon order creation
			return {
				success: true,
				paymentStatus: "paid",
				paymentData: {
					confirmedImmediately: true,
				},
			};
		}

		// Manual confirmation by store staff
		// The actual order update is handled by the caller (e.g., mark-order-as-paid action)
		return {
			success: true,
			paymentStatus: "paid",
			paymentData: {
				confirmedImmediately: false,
				confirmedBy: paymentData.confirmedBy as string | undefined,
			},
		};
	}

	async verifyPaymentStatus(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentStatus> {
		// Cash payment status is determined by order.isPaid
		// If order is marked as paid, payment is successful
		// Status check is done by the caller querying the order
		return {
			status: "pending", // Will be updated by caller based on actual order status
			paymentData: {
				orderId,
			},
		};
	}

	calculateFees(amount: number, config: PluginConfig): FeeStructure {
		// Cash payments have zero fees
		return {
			feeRate: 0,
			feeAdditional: 0,
			calculateFee: () => 0,
		};
	}

	validateConfiguration(config: PluginConfig): ValidationResult {
		// Cash plugin has no special configuration requirements
		// Optional: immediateConfirmation (boolean)
		const errors: string[] = [];

		if (
			config.storeConfig?.immediateConfirmation !== undefined &&
			typeof config.storeConfig.immediateConfirmation !== "boolean"
		) {
			errors.push("immediateConfirmation must be a boolean");
		}

		return {
			valid: errors.length === 0,
			errors: errors.length > 0 ? errors : undefined,
		};
	}

	checkAvailability(
		order: StoreOrder,
		config: PluginConfig,
	): AvailabilityResult {
		// Cash payment is always available
		// Suitable for in-store transactions, order pickup, or delivery scenarios
		return {
			available: true,
		};
	}
}

// Export singleton instance
export const cashPlugin = new CashPlugin();

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
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

/**
 * Credit-based Payment Method Plugin
 *
 * Implements payment processing using customer credit balance.
 * Handles credit balance checking, deduction, and immediate payment confirmation.
 */
export class CreditPlugin implements PaymentMethodPlugin {
	readonly identifier = "credit";
	readonly name = "Credit";
	readonly description = "Payments using customer credit balance (儲值點數)";
	readonly version = "1.0.0";

	async processPayment(
		order: StoreOrder,
		config: PluginConfig,
	): Promise<PaymentResult> {
		// Credit payments are processed immediately (no external gateway)
		// The actual credit deduction happens in confirmPayment
		// This method just validates availability
		const availability = this.checkAvailability(order, config);

		if (!availability.available) {
			return {
				success: false,
				error: availability.reason || "Credit payment not available",
			};
		}

		return {
			success: true,
			// No redirect URL needed - payment is processed immediately
		};
	}

	async confirmPayment(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentConfirmation> {
		// Get order with required relations
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			include: {
				Store: {
					select: {
						useCustomerCredit: true,
						creditExchangeRate: true,
					},
				},
				User: {
					select: {
						id: true,
					},
				},
			},
		});

		if (!order) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "Order not found",
			};
		}

		if (!order.User) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "Order must have a user ID for credit payment",
			};
		}

		if (!order.Store.useCustomerCredit) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "Store does not have credit system enabled",
			};
		}

		// Calculate required credit amount
		const orderTotal = Number(order.orderTotal);
		const creditExchangeRate = Number(order.Store.creditExchangeRate) || 1;
		const requiredCredit = orderTotal / creditExchangeRate;

		// Check customer credit balance
		const customerCredit = await sqlClient.customerCredit.findUnique({
			where: {
				userId: order.User.id,
			},
		});

		const currentBalance = customerCredit ? Number(customerCredit.point) : 0;

		if (currentBalance < requiredCredit) {
			logger.warn("Insufficient credit balance for payment", {
				metadata: {
					orderId,
					userId: order.User.id,
					requiredCredit,
					currentBalance,
				},
				tags: ["payment", "credit", "warning"],
			});

			return {
				success: false,
				paymentStatus: "failed",
				error: "Insufficient credit balance",
			};
		}

		// Credit deduction and ledger entries are handled by the caller
		// (e.g., processRsvpPrepaidPayment or order payment processing)
		// This plugin just confirms that payment can proceed
		return {
			success: true,
			paymentStatus: "paid",
			paymentData: {
				requiredCredit,
				currentBalance,
				newBalance: currentBalance - requiredCredit,
			},
		};
	}

	async verifyPaymentStatus(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentStatus> {
		// Credit payments are confirmed immediately
		// If the order is marked as paid, payment is successful
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			select: {
				isPaid: true,
				paymentStatus: true,
			},
		});

		if (!order) {
			return {
				status: "failed",
			};
		}

		if (order.isPaid) {
			return {
				status: "paid",
				paymentData: {
					orderId,
				},
			};
		}

		return {
			status: "pending",
			paymentData: {
				orderId,
			},
		};
	}

	calculateFees(amount: number, config: PluginConfig): FeeStructure {
		// Credit payments have zero fees
		return {
			feeRate: 0,
			feeAdditional: 0,
			calculateFee: () => 0,
		};
	}

	validateConfiguration(config: PluginConfig): ValidationResult {
		// Credit plugin requires store to have credit system enabled
		// This is validated at runtime in checkAvailability
		return {
			valid: true,
		};
	}

	checkAvailability(
		order: StoreOrder,
		config: PluginConfig,
	): AvailabilityResult {
		// Credit payment requires:
		// 1. User must be signed in (userId must exist)
		// 2. Store must have credit system enabled
		// 3. Customer must have sufficient credit balance

		if (!order.userId) {
			return {
				available: false,
				reason: "User must be signed in to use credit payment",
			};
		}

		// Store credit system check happens at runtime during payment processing
		// We can't check it here without querying the database
		// So we return available=true here and validate at payment time

		return {
			available: true,
		};
	}
}

// Export singleton instance
export const creditPlugin = new CreditPlugin();

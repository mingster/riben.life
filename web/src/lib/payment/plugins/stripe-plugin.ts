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
import { stripe } from "@/lib/stripe/config";
import logger from "@/lib/logger";
import type Stripe from "stripe";

/**
 * Stripe Payment Method Plugin
 *
 * Implements payment processing via Stripe payment gateway.
 * Handles payment intent creation, confirmation, and status verification.
 */
export class StripePlugin implements PaymentMethodPlugin {
	readonly identifier = "stripe";
	readonly name = "Stripe";
	readonly description =
		"Credit/debit card payments via Stripe payment gateway";
	readonly version = "1.0.0";

	async processPayment(
		order: StoreOrder,
		config: PluginConfig,
	): Promise<PaymentResult> {
		try {
			// Create Stripe PaymentIntent
			const paymentIntent = await stripe.paymentIntents.create({
				amount: Math.round(Number(order.orderTotal) * 100), // Convert to cents
				currency: order.currency.toLowerCase(),
				metadata: {
					orderId: order.id,
					storeId: order.storeId,
				},
			});

			// Return payment intent ID for confirmation
			return {
				success: true,
				paymentData: {
					paymentIntentId: paymentIntent.id,
					clientSecret: paymentIntent.client_secret,
				},
			};
		} catch (error) {
			logger.error("Stripe payment processing failed", {
				metadata: {
					orderId: order.id,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "stripe", "error"],
			});

			return {
				success: false,
				error:
					error instanceof Error ? error.message : "Payment processing failed",
			};
		}
	}

	async confirmPayment(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentConfirmation> {
		const paymentIntentId = paymentData.paymentIntentId as string;

		if (!paymentIntentId) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "Payment intent ID is required",
			};
		}

		try {
			// Retrieve and verify payment intent
			const paymentIntent =
				await stripe.paymentIntents.retrieve(paymentIntentId);

			if (paymentIntent.status === "succeeded") {
				return {
					success: true,
					paymentStatus: "paid",
					paymentData: {
						paymentIntentId: paymentIntent.id,
						chargeId: paymentIntent.latest_charge as string,
					},
				};
			}

			if (paymentIntent.status === "requires_payment_method") {
				return {
					success: false,
					paymentStatus: "failed",
					error: "Payment requires a payment method",
				};
			}

			// Payment is still processing or requires action
			return {
				success: false,
				paymentStatus: "pending",
				error: `Payment status: ${paymentIntent.status}`,
			};
		} catch (error) {
			logger.error("Stripe payment confirmation failed", {
				metadata: {
					orderId,
					paymentIntentId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "stripe", "error"],
			});

			return {
				success: false,
				paymentStatus: "failed",
				error:
					error instanceof Error
						? error.message
						: "Payment confirmation failed",
			};
		}
	}

	async verifyPaymentStatus(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentStatus> {
		const paymentIntentId = paymentData.paymentIntentId as string;

		if (!paymentIntentId) {
			return {
				status: "failed",
			};
		}

		try {
			const paymentIntent =
				await stripe.paymentIntents.retrieve(paymentIntentId);

			if (paymentIntent.status === "succeeded") {
				return {
					status: "paid",
					paymentData: {
						paymentIntentId: paymentIntent.id,
					},
				};
			}

			if (
				paymentIntent.status === "requires_payment_method" ||
				paymentIntent.status === "canceled"
			) {
				return {
					status: "failed",
					paymentData: {
						paymentIntentId: paymentIntent.id,
					},
				};
			}

			// Payment is still processing
			return {
				status: "pending",
				paymentData: {
					paymentIntentId: paymentIntent.id,
				},
			};
		} catch (error) {
			logger.error("Stripe payment status verification failed", {
				metadata: {
					orderId,
					paymentIntentId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "stripe", "error"],
			});

			return {
				status: "failed",
			};
		}
	}

	calculateFees(amount: number, config: PluginConfig): FeeStructure {
		// Default Stripe fees: 2.9% + 30¢
		const defaultFeeRate = 0.029;
		const defaultFeeAdditional = 0.3;

		// Allow override from config (platform or store level)
		const feeRate =
			config.storeConfig?.feeRate ??
			config.platformConfig?.feeRate ??
			defaultFeeRate;
		const feeAdditional =
			config.storeConfig?.feeAdditional ??
			config.platformConfig?.feeAdditional ??
			defaultFeeAdditional;

		return {
			feeRate,
			feeAdditional,
			calculateFee: (amt: number) => {
				return amt * feeRate + feeAdditional;
			},
		};
	}

	validateConfiguration(config: PluginConfig): ValidationResult {
		// Stripe requires API keys (handled at platform level via environment variables)
		// Store-level configuration is optional (for custom fees)
		const errors: string[] = [];

		if (!process.env.STRIPE_SECRET_KEY) {
			errors.push("Stripe secret key is not configured");
		}

		if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
			errors.push("Stripe publishable key is not configured");
		}

		// Validate fee configuration if provided
		if (config.storeConfig?.feeRate !== undefined) {
			const feeRate = Number(config.storeConfig.feeRate);
			if (isNaN(feeRate) || feeRate < 0 || feeRate > 1) {
				errors.push("Fee rate must be between 0 and 1");
			}
		}

		if (config.storeConfig?.feeAdditional !== undefined) {
			const feeAdditional = Number(config.storeConfig.feeAdditional);
			if (isNaN(feeAdditional) || feeAdditional < 0) {
				errors.push("Additional fee must be a non-negative number");
			}
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
		// Stripe is available if API keys are configured
		if (!process.env.STRIPE_SECRET_KEY) {
			return {
				available: false,
				reason: "Stripe secret key is not configured",
			};
		}

		if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
			return {
				available: false,
				reason: "Stripe publishable key is not configured",
			};
		}

		return {
			available: true,
		};
	}
}

// Export singleton instance
export const stripePlugin = new StripePlugin();

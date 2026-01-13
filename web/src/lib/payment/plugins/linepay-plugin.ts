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
import { type Currency, getLinePayClientByStore } from "@/lib/linePay";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { LinePayClient } from "@/lib/linePay/type";

/**
 * LINE Pay Payment Method Plugin
 *
 * Implements payment processing via LINE Pay service.
 * Handles payment request creation, confirmation, and status verification.
 */
export class LinePayPlugin implements PaymentMethodPlugin {
	readonly identifier = "linepay";
	readonly name = "LINE Pay";
	readonly description = "Payments via LINE Pay service";
	readonly version = "1.0.0";

	/**
	 * Get LINE Pay client from store configuration or platform defaults
	 */
	private async getLinePayClientForStore(
		storeId: string,
		config: PluginConfig,
	): Promise<LinePayClient | null> {
		try {
			return await getLinePayClientByStore(storeId);
		} catch (error) {
			logger.error("Failed to get LINE Pay client", {
				metadata: {
					storeId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "linepay", "error"],
			});
			return null;
		}
	}

	async processPayment(
		order: StoreOrder,
		config: PluginConfig,
	): Promise<PaymentResult> {
		try {
			// This method doesn't create the payment request here
			// Payment request is created in the LINE Pay page component
			// This plugin method can be used for validation/preparation
			const linePayClient = await this.getLinePayClientForStore(
				order.storeId,
				config,
			);

			if (!linePayClient) {
				return {
					success: false,
					error: "LINE Pay client is not configured",
				};
			}

			return {
				success: true,
				// redirectUrl and paymentData will be set by the LINE Pay page component
			};
		} catch (error) {
			logger.error("LINE Pay payment processing failed", {
				metadata: {
					orderId: order.id,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "linepay", "error"],
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
		const transactionId = paymentData.transactionId as string;

		if (!transactionId) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "Transaction ID is required",
			};
		}

		const linePayClient = await this.getLinePayClientForStore(
			config.storeId,
			config,
		);

		if (!linePayClient) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "LINE Pay client is not configured",
			};
		}

		try {
			// Get order to get amount and currency
			const order = await sqlClient.storeOrder.findUnique({
				where: { id: orderId },
				select: {
					orderTotal: true,
					currency: true,
				},
			});

			if (!order) {
				return {
					success: false,
					paymentStatus: "failed",
					error: "Order not found",
				};
			}

			// Confirm payment via LINE Pay API
			const confirmResult = await linePayClient.confirm.send({
				transactionId,
				body: {
					amount: Number(order.orderTotal),
					currency: order.currency as Currency,
				},
			});

			if (confirmResult.body.returnCode === "0000") {
				return {
					success: true,
					paymentStatus: "paid",
					paymentData: {
						transactionId: confirmResult.body.info.transactionId,
					},
				};
			}

			return {
				success: false,
				paymentStatus: "failed",
				error:
					confirmResult.body.returnMessage || "Payment confirmation failed",
			};
		} catch (error) {
			logger.error("LINE Pay payment confirmation failed", {
				metadata: {
					orderId,
					transactionId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "linepay", "error"],
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
		const transactionId = paymentData.transactionId as string;

		if (!transactionId) {
			return {
				status: "failed",
			};
		}

		const linePayClient = await this.getLinePayClientForStore(
			config.storeId,
			config,
		);

		if (!linePayClient) {
			return {
				status: "failed",
			};
		}

		try {
			// Check payment status via LINE Pay Payment Details API
			// This API returns full transaction information including payment status
			const paymentDetailsResult = await linePayClient.paymentDetails.send({
				params: {
					transactionId: [transactionId],
				},
			});

			if (paymentDetailsResult.body.returnCode === "0000") {
				// Find the transaction in the info array
				const transactionInfo = paymentDetailsResult.body.info?.find(
					(info) => info.transactionId === transactionId,
				);

				if (!transactionInfo) {
					return {
						status: "failed",
					};
				}

				// Check payment status from transaction info
				// payStatus values:
				// - CAPTURE: Payment is completed (paid)
				// - AUTHORIZATION: Authorization only, needs capture (pending)
				// - VOIDED_AUTHORIZATION: Authorization voided (failed)
				// - EXPIRED_AUTHORIZATION: Authorization expired (failed)
				const payStatus = transactionInfo.payStatus;

				if (payStatus === "CAPTURE") {
					return {
						status: "paid",
						paymentData: {
							transactionId,
						},
					};
				}

				if (
					payStatus === "VOIDED_AUTHORIZATION" ||
					payStatus === "EXPIRED_AUTHORIZATION"
				) {
					return {
						status: "failed",
						paymentData: {
							transactionId,
						},
					};
				}

				// Payment is still pending (AUTHORIZATION status needs capture)
				return {
					status: "pending",
					paymentData: {
						transactionId,
					},
				};
			}

			return {
				status: "failed",
			};
		} catch (error) {
			logger.error("LINE Pay payment status verification failed", {
				metadata: {
					orderId,
					transactionId,
					error: error instanceof Error ? error.message : String(error),
				},
				tags: ["payment", "linepay", "error"],
			});

			return {
				status: "failed",
			};
		}
	}

	calculateFees(amount: number, config: PluginConfig): FeeStructure {
		// Default LINE Pay fees: 3.0%
		const defaultFeeRate = 0.03;
		const defaultFeeAdditional = 0;

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
		const errors: string[] = [];

		// Check if LINE Pay credentials are available (platform or store level)
		const hasStoreConfig =
			config.storeConfig?.linePayId && config.storeConfig?.linePaySecret;
		const hasPlatformConfig =
			config.platformConfig?.linePayId && config.platformConfig?.linePaySecret;
		const hasEnvConfig =
			process.env.LINE_PAY_CHANNEL_ID && process.env.LINE_PAY_CHANNEL_SECRET;

		if (!hasStoreConfig && !hasPlatformConfig && !hasEnvConfig) {
			errors.push(
				"LINE Pay credentials are not configured (neither store, platform, nor environment)",
			);
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

	async checkAvailability(
		order: StoreOrder,
		config: PluginConfig,
	): Promise<AvailabilityResult> {
		// LINE Pay is available if credentials are configured
		const linePayClient = await this.getLinePayClientForStore(
			order.storeId,
			config,
		);

		if (!linePayClient) {
			return {
				available: false,
				reason: "LINE Pay credentials are not configured",
			};
		}

		return {
			available: true,
		};
	}
}

// Export singleton instance
export const linePayPlugin = new LinePayPlugin();

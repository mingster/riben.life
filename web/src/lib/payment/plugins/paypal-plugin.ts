import type { StoreOrder } from "@prisma/client";

import logger from "@/lib/logger";
import { getPayPalCredentialsByStore } from "@/lib/payment/paypal";

import type {
	AvailabilityResult,
	FeeStructure,
	PaymentConfirmation,
	PaymentData,
	PaymentMethodPlugin,
	PaymentResult,
	PaymentStatus,
	PluginConfig,
	ValidationResult,
} from "./types";

/**
 * PayPal Payment Method Plugin (Orders API v2; shop checkout uses redirect + capture).
 */
export class PayPalPlugin implements PaymentMethodPlugin {
	readonly identifier = "paypal";
	readonly name = "PayPal";
	readonly description = "PayPal checkout (redirect)";
	readonly version = "1.0.0";

	async processPayment(
		_order: StoreOrder,
		_config: PluginConfig,
	): Promise<PaymentResult> {
		return {
			success: true,
		};
	}

	async confirmPayment(
		orderId: string,
		paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentConfirmation> {
		const captureId = paymentData.captureId as string | undefined;
		if (!captureId) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "captureId is required",
			};
		}
		logger.info("PayPal confirmPayment (metadata)", {
			metadata: { orderId, captureId },
			tags: ["payment", "paypal"],
		});
		return {
			success: true,
			paymentStatus: "paid",
			paymentData: { captureId },
		};
	}

	async verifyPaymentStatus(
		_orderId: string,
		paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentStatus> {
		const captureId = paymentData.captureId as string | undefined;
		if (!captureId) {
			return { status: "failed" };
		}
		return {
			status: "paid",
			paymentData: { captureId },
		};
	}

	calculateFees(_amount: number, config: PluginConfig): FeeStructure {
		const defaultFeeRate = 0.04;
		const defaultFeeAdditional = 0.3;
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
			calculateFee: (amt: number) => amt * feeRate + feeAdditional,
		};
	}

	validateConfiguration(_config: PluginConfig): ValidationResult {
		// Store-level or platform credentials are resolved at runtime via getPayPalCredentialsByStore
		return { valid: true };
	}

	async checkAvailability(
		order: StoreOrder,
		_config: PluginConfig,
	): Promise<AvailabilityResult> {
		const creds = await getPayPalCredentialsByStore(order.storeId);
		if (!creds) {
			return {
				available: false,
				reason: "PayPal credentials are not configured",
			};
		}
		return { available: true };
	}
}

export const payPalPlugin = new PayPalPlugin();

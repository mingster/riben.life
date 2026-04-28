import type { StoreOrder } from "@prisma/client";
import { getNewebPayCredentialsByStore } from "@/lib/payment/newebpay";
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
 * NewebPay Payment Method Plugin (MPG redirect checkout).
 */
export class NewebPayPlugin implements PaymentMethodPlugin {
	readonly identifier = "newebpay";
	readonly name = "NewebPay";
	readonly description = "NewebPay MPG redirect checkout";
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
		_orderId: string,
		paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentConfirmation> {
		const tradeNo = paymentData.tradeNo as string | undefined;
		if (!tradeNo) {
			return {
				success: false,
				paymentStatus: "failed",
				error: "tradeNo is required",
			};
		}

		return {
			success: true,
			paymentStatus: "paid",
			paymentData: {
				tradeNo,
				merchantOrderNo: paymentData.merchantOrderNo,
				paymentType: paymentData.paymentType,
			},
		};
	}

	async verifyPaymentStatus(
		_orderId: string,
		paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentStatus> {
		const tradeNo = paymentData.tradeNo as string | undefined;
		if (!tradeNo) {
			return { status: "failed" };
		}
		return { status: "paid", paymentData };
	}

	calculateFees(_amount: number, config: PluginConfig): FeeStructure {
		const defaultFeeRate = 0.028;
		const defaultFeeAdditional = 0;
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
		return { valid: true };
	}

	async checkAvailability(
		order: StoreOrder,
		_config: PluginConfig,
	): Promise<AvailabilityResult> {
		const credentials = await getNewebPayCredentialsByStore(order.storeId);
		if (!credentials) {
			return {
				available: false,
				reason: "NewebPay credentials are not configured",
			};
		}
		return { available: true };
	}
}

export const newebPayPlugin = new NewebPayPlugin();

import type {
	AvailabilityResult,
	PaymentMethodPlugin,
	PaymentResult,
	PaymentConfirmation,
	PaymentStatus,
	FeeStructure,
	PluginConfig,
	ValidationResult,
	PaymentData,
} from "./types";
import type { StoreOrder } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";

/**
 * Bank ATM / wire transfer payment plugin.
 * Requires store bank code, account number, and account name to be configured.
 * Staff confirms payment after verifying the transfer (same flow as cash).
 */
export class AtmPlugin implements PaymentMethodPlugin {
	readonly identifier = "atm";
	readonly name = "ATM / Bank transfer";
	readonly description = "Transfer to the store bank account (ATM 轉帳)";
	readonly version = "1.0.0";

	async processPayment(
		_order: StoreOrder,
		_config: PluginConfig,
	): Promise<PaymentResult> {
		return { success: true };
	}

	async confirmPayment(
		_orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentConfirmation> {
		const immediateConfirmation =
			config.storeConfig?.immediateConfirmation ?? false;

		if (immediateConfirmation) {
			return {
				success: true,
				paymentStatus: "paid",
				paymentData: {
					confirmedImmediately: true,
				},
			};
		}

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
		_paymentData: PaymentData,
		_config: PluginConfig,
	): Promise<PaymentStatus> {
		return {
			status: "pending",
			paymentData: {
				orderId,
			},
		};
	}

	calculateFees(_amount: number, _config: PluginConfig): FeeStructure {
		return {
			feeRate: 0,
			feeAdditional: 0,
			calculateFee: () => 0,
		};
	}

	validateConfiguration(config: PluginConfig): ValidationResult {
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

	async checkAvailability(
		_order: StoreOrder,
		config: PluginConfig,
	): Promise<AvailabilityResult> {
		const store = await sqlClient.store.findUnique({
			where: { id: config.storeId },
			select: {
				bankCode: true,
				bankAccount: true,
				bankAccountName: true,
			},
		});

		const trim = (s: string | null | undefined): string => (s ?? "").trim();

		if (
			!store ||
			!trim(store.bankCode) ||
			!trim(store.bankAccount) ||
			!trim(store.bankAccountName)
		) {
			return {
				available: false,
				reason: "Bank transfer details are not configured for this store.",
			};
		}

		return { available: true };
	}
}

export const atmPlugin = new AtmPlugin();

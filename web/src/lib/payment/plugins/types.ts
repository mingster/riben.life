import type { StoreOrder } from "@prisma/client";

/**
 * Payment Method Plugin Interface
 *
 * All payment method plugins must implement this interface to provide
 * consistent payment processing, confirmation, and fee calculation.
 */
export interface PaymentMethodPlugin {
	// Plugin metadata
	readonly identifier: string; // Unique plugin ID (e.g., "stripe", "linepay", "credit", "cash")
	readonly name: string; // Display name
	readonly description: string;
	readonly version: string;

	// Core payment methods
	processPayment(
		order: StoreOrder,
		config: PluginConfig,
	): Promise<PaymentResult>;

	confirmPayment(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentConfirmation>;

	verifyPaymentStatus(
		orderId: string,
		paymentData: PaymentData,
		config: PluginConfig,
	): Promise<PaymentStatus>;

	// Fee calculation
	calculateFees(amount: number, config: PluginConfig): FeeStructure;

	// Configuration
	validateConfiguration(config: PluginConfig): ValidationResult;

	// Availability check
	checkAvailability(
		order: StoreOrder,
		config: PluginConfig,
	): AvailabilityResult | Promise<AvailabilityResult>;
}

/**
 * Result of payment processing
 */
export interface PaymentResult {
	success: boolean;
	redirectUrl?: string; // For external payment gateways (Stripe, LINE Pay)
	paymentData?: PaymentData; // For storing payment intent/transaction IDs
	error?: string;
}

/**
 * Result of payment confirmation
 */
export interface PaymentConfirmation {
	success: boolean;
	paymentStatus: "paid" | "failed" | "pending";
	paymentData?: PaymentData;
	error?: string;
}

/**
 * Current payment status
 */
export interface PaymentStatus {
	status: "paid" | "failed" | "pending";
	paymentData?: PaymentData;
}

/**
 * Fee structure and calculation
 */
export interface FeeStructure {
	feeRate: number; // Percentage (e.g., 0.029 = 2.9%)
	feeAdditional: number; // Flat amount
	calculateFee(amount: number): number; // Total fee calculation
}

/**
 * Plugin configuration (platform-level and store-level)
 */
export interface PluginConfig {
	storeId: string;
	platformConfig?: Record<string, any>; // Platform-level configuration
	storeConfig?: Record<string, any>; // Store-level configuration (overrides platform)
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
	valid: boolean;
	errors?: string[];
}

/**
 * Availability check result
 */
export interface AvailabilityResult {
	available: boolean;
	reason?: string;
}

/**
 * Plugin-specific payment data (e.g., payment intent ID, transaction ID)
 */
export interface PaymentData {
	[key: string]: any;
}

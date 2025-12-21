/**
 * Plugin Utilities
 *
 * Utility functions for working with payment method plugins and database records.
 * Bridges the gap between PaymentMethod database records and plugin instances.
 */

import { sqlClient } from "@/lib/prismadb";
import type { PaymentMethod, StoreOrder } from "@prisma/client";
import { getPaymentPlugin, paymentPluginRegistry } from "./registry";
import type { PaymentMethodPlugin, PluginConfig } from "./types";
import logger from "@/lib/logger";

/**
 * Get payment method plugin from PaymentMethod database record
 *
 * @param paymentMethod - PaymentMethod record from database
 * @returns Plugin instance if found, undefined otherwise
 */
export function getPluginFromPaymentMethod(
	paymentMethod: PaymentMethod | null | undefined,
): PaymentMethodPlugin | undefined {
	if (!paymentMethod || !paymentMethod.payUrl) {
		return undefined;
	}

	return getPaymentPlugin(paymentMethod.payUrl);
}

/**
 * Get payment method plugin from order's payment method
 *
 * @param order - StoreOrder with PaymentMethod relation
 * @returns Plugin instance if found, undefined otherwise
 */
export function getPluginFromOrder(
	order: StoreOrder & { PaymentMethod?: PaymentMethod | null },
): PaymentMethodPlugin | undefined {
	if (!order.PaymentMethod) {
		return undefined;
	}

	return getPluginFromPaymentMethod(order.PaymentMethod);
}

/**
 * Get payment method plugin by payUrl identifier
 *
 * @param payUrl - Plugin identifier (e.g., "stripe", "linepay", "credit", "cash")
 * @returns Plugin instance if found, undefined otherwise
 */
export function getPluginByPayUrl(
	payUrl: string | null | undefined,
): PaymentMethodPlugin | undefined {
	if (!payUrl) {
		return undefined;
	}

	return getPaymentPlugin(payUrl);
}

/**
 * Build PluginConfig from store and payment method data
 *
 * Creates configuration object with platform and store-level settings
 * for use with payment method plugins.
 *
 * @param storeId - Store ID
 * @param paymentMethod - PaymentMethod record (optional, for fee defaults)
 * @param storePaymentMethodMapping - StorePaymentMethodMapping record (optional, for store-specific config)
 * @returns PluginConfig object
 */
export async function buildPluginConfig(
	storeId: string,
	paymentMethod?: PaymentMethod | null,
	storePaymentMethodMapping?: { paymentDisplayName?: string | null } | null,
): Promise<PluginConfig> {
	const config: PluginConfig = {
		storeId,
		platformConfig: {},
		storeConfig: {},
	};

	// Add payment method fee defaults to platform config if available
	if (paymentMethod) {
		config.platformConfig = {
			feeRate: Number(paymentMethod.fee),
			feeAdditional: Number(paymentMethod.feeAdditional),
		};

		// Store-level configuration can override fees
		// For now, we use the PaymentMethod record's fees
		// Future: StorePaymentMethodMapping could have fee overrides
		if (storePaymentMethodMapping?.paymentDisplayName) {
			config.storeConfig = {
				paymentDisplayName: storePaymentMethodMapping.paymentDisplayName,
			};
		}
	}

	// Future enhancements:
	// - Load platform-level configuration from a PlatformPaymentMethodConfig table
	// - Load store-level configuration from StorePaymentMethodConfig table
	// - Merge configurations with store-level taking precedence

	return config;
}

/**
 * Get payment method plugin and config from order
 *
 * Convenience function that retrieves both the plugin and builds the config
 * from an order's payment method.
 *
 * @param order - StoreOrder with PaymentMethod relation
 * @returns Object with plugin and config, or null if plugin not found
 */
export async function getPluginAndConfigFromOrder(
	order: StoreOrder & { PaymentMethod?: PaymentMethod | null },
): Promise<{ plugin: PaymentMethodPlugin; config: PluginConfig } | null> {
	const plugin = getPluginFromOrder(order);

	if (!plugin) {
		logger.warn("Payment method plugin not found for order", {
			metadata: {
				orderId: order.id,
				paymentMethodId: order.paymentMethodId,
				payUrl: order.PaymentMethod?.payUrl,
			},
			tags: ["payment", "plugin"],
		});
		return null;
	}

	// Get store payment method mapping if exists
	let storeMapping = null;
	if (order.paymentMethodId) {
		storeMapping = await sqlClient.storePaymentMethodMapping.findUnique({
			where: {
				storeId_methodId: {
					storeId: order.storeId,
					methodId: order.paymentMethodId,
				},
			},
		});
	}

	const config = await buildPluginConfig(
		order.storeId,
		order.PaymentMethod || null,
		storeMapping,
	);

	return { plugin, config };
}

/**
 * Get payment method plugin and config by payment method ID
 *
 * @param storeId - Store ID
 * @param paymentMethodId - Payment method ID
 * @returns Object with plugin and config, or null if not found
 */
export async function getPluginAndConfigByPaymentMethodId(
	storeId: string,
	paymentMethodId: string,
): Promise<{ plugin: PaymentMethodPlugin; config: PluginConfig } | null> {
	const paymentMethod = await sqlClient.paymentMethod.findUnique({
		where: { id: paymentMethodId },
	});

	if (!paymentMethod) {
		return null;
	}

	const plugin = getPluginFromPaymentMethod(paymentMethod);
	if (!plugin) {
		return null;
	}

	const storeMapping = await sqlClient.storePaymentMethodMapping.findUnique({
		where: {
			storeId_methodId: {
				storeId,
				methodId: paymentMethodId,
			},
		},
	});

	const config = await buildPluginConfig(storeId, paymentMethod, storeMapping);

	return { plugin, config };
}

/**
 * Validate that a payment method has a corresponding plugin
 *
 * @param paymentMethod - PaymentMethod record
 * @returns true if plugin exists, false otherwise
 */
export function validatePaymentMethodHasPlugin(
	paymentMethod: PaymentMethod,
): boolean {
	if (!paymentMethod.payUrl) {
		return false;
	}

	return getPaymentPlugin(paymentMethod.payUrl) !== undefined;
}

/**
 * Get all registered plugin identifiers
 *
 * @returns Array of plugin identifiers
 */
export function getRegisteredPluginIdentifiers(): string[] {
	return paymentPluginRegistry.getIdentifiers();
}

/**
 * Check if a payUrl identifier corresponds to a registered plugin
 *
 * @param payUrl - Plugin identifier
 * @returns true if plugin is registered, false otherwise
 */
export function isPluginRegistered(payUrl: string): boolean {
	return getPaymentPlugin(payUrl) !== undefined;
}

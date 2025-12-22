/**
 * Plugin Loader
 *
 * Functions for loading and synchronizing plugins with database PaymentMethod records.
 * Handles the registration bridge between database records and plugin instances.
 */

import { sqlClient } from "@/lib/prismadb";
import { getPaymentPlugin, paymentPluginRegistry } from "./registry";
import type { PaymentMethodPlugin } from "./types";
import logger from "@/lib/logger";
import { isPluginRegistered } from "./utils";

/**
 * Validate all PaymentMethod records have corresponding plugins
 *
 * Checks all non-deleted payment methods and logs warnings for any
 * that don't have registered plugins.
 *
 * @returns Array of PaymentMethod records without plugins
 */
export async function validatePaymentMethodPlugins(): Promise<
	Array<{ id: string; name: string; payUrl: string }>
> {
	const paymentMethods = await sqlClient.paymentMethod.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			payUrl: true,
		},
	});

	const missingPlugins: Array<{ id: string; name: string; payUrl: string }> =
		[];

	for (const method of paymentMethods) {
		if (!method.payUrl) {
			logger.warn("Payment method has no payUrl (plugin identifier)", {
				metadata: {
					paymentMethodId: method.id,
					paymentMethodName: method.name,
				},
				tags: ["payment", "plugin", "validation"],
			});
			continue;
		}

		if (!isPluginRegistered(method.payUrl)) {
			missingPlugins.push({
				id: method.id,
				name: method.name,
				payUrl: method.payUrl,
			});

			logger.warn("Payment method plugin not registered", {
				metadata: {
					paymentMethodId: method.id,
					paymentMethodName: method.name,
					payUrl: method.payUrl,
				},
				tags: ["payment", "plugin", "validation"],
			});
		}
	}

	return missingPlugins;
}

/**
 * Get plugin metadata for a PaymentMethod record
 *
 * If a plugin exists for the payment method's payUrl, returns the plugin's metadata.
 * Otherwise returns metadata from the database record.
 *
 * @param paymentMethod - PaymentMethod record
 * @returns Plugin metadata (identifier, name, description, version)
 */
export function getPaymentMethodPluginMetadata(paymentMethod: {
	payUrl: string;
	name: string;
}): {
	identifier: string;
	name: string;
	description: string;
	version: string;
	isRegistered: boolean;
} {
	const plugin = getPaymentPlugin(paymentMethod.payUrl);

	if (plugin) {
		return {
			identifier: plugin.identifier,
			name: plugin.name,
			description: plugin.description,
			version: plugin.version,
			isRegistered: true,
		};
	}

	// Fallback to database record if plugin not found
	return {
		identifier: paymentMethod.payUrl,
		name: paymentMethod.name,
		description: `Payment method: ${paymentMethod.name}`,
		version: "unknown",
		isRegistered: false,
	};
}

/**
 * List all registered plugins with their metadata
 *
 * @returns Array of plugin metadata
 */
export function listRegisteredPlugins(): Array<{
	identifier: string;
	name: string;
	description: string;
	version: string;
}> {
	const plugins = paymentPluginRegistry.getAll();

	return plugins.map((plugin) => ({
		identifier: plugin.identifier,
		name: plugin.name,
		description: plugin.description,
		version: plugin.version,
	}));
}

/**
 * Find PaymentMethod records that use a specific plugin
 *
 * @param pluginIdentifier - Plugin identifier (e.g., "stripe", "linepay")
 * @returns Array of PaymentMethod records using this plugin
 */
export async function findPaymentMethodsByPlugin(
	pluginIdentifier: string,
): Promise<
	Array<{
		id: string;
		name: string;
		payUrl: string;
		isDeleted: boolean;
		isDefault: boolean;
	}>
> {
	const paymentMethods = await sqlClient.paymentMethod.findMany({
		where: {
			payUrl: pluginIdentifier,
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			payUrl: true,
			isDeleted: true,
			isDefault: true,
		},
	});

	return paymentMethods;
}

/**
 * Synchronize plugin registration with database PaymentMethod records
 *
 * This function can be used to ensure all PaymentMethod records in the database
 * have corresponding registered plugins. It validates and logs any mismatches.
 *
 * @returns Summary of synchronization results
 */
export async function synchronizePluginsWithDatabase(): Promise<{
	totalPaymentMethods: number;
	registeredPlugins: number;
	missingPlugins: number;
	warnings: Array<{ paymentMethodId: string; message: string }>;
}> {
	const paymentMethods = await sqlClient.paymentMethod.findMany({
		where: {
			isDeleted: false,
		},
		select: {
			id: true,
			name: true,
			payUrl: true,
		},
	});

	const registeredPlugins = paymentPluginRegistry.getAll();
	const missingPlugins = await validatePaymentMethodPlugins();

	const warnings: Array<{ paymentMethodId: string; message: string }> = [];

	for (const method of paymentMethods) {
		if (!method.payUrl) {
			warnings.push({
				paymentMethodId: method.id,
				message: `Payment method "${method.name}" has no payUrl (plugin identifier)`,
			});
		} else if (!isPluginRegistered(method.payUrl)) {
			warnings.push({
				paymentMethodId: method.id,
				message: `Payment method "${method.name}" (payUrl: "${method.payUrl}") has no registered plugin`,
			});
		}
	}

	return {
		totalPaymentMethods: paymentMethods.length,
		registeredPlugins: registeredPlugins.length,
		missingPlugins: missingPlugins.length,
		warnings,
	};
}

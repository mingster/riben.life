/**
 * Plugin Loader
 *
 * Functions for loading and synchronizing plugins with database PaymentMethod records.
 * Handles the registration bridge between database records and plugin instances.
 */

import { sqlClient } from "@/lib/prismadb";
import { getPaymentPlugin, paymentPluginRegistry } from "./registry";
import logger from "@/lib/logger";
import { isPluginRegistered } from "./utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

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
	await synchronizePaymentMethodCatalogFromPlugins();

	const paymentMethods = await sqlClient.paymentMethod.findMany({
		where: { isDeleted: false },
		select: { id: true, name: true, payUrl: true },
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

/**
 * Keep PaymentMethod rows in sync with registered plugins.
 * - Auto-create missing rows for plugins (platform/store flags default to false)
 * - Hard-delete rows that no longer have plugin code, including their mappings
 */
export async function synchronizePaymentMethodCatalogFromPlugins(): Promise<{
	autoCreatedRows: string[];
	deletedMethods: number;
	deletedMappings: number;
	keptMethods: number;
	remainingMismatches: string[];
}> {
	const now = getUtcNowEpoch();
	const plugins = paymentPluginRegistry.getAll().map((plugin) => ({
		payUrl: plugin.identifier.trim().toLowerCase(),
		name: plugin.name.trim() || plugin.identifier,
		description: plugin.description.trim(),
	}));
	const pluginPayUrls = new Set(plugins.map((plugin) => plugin.payUrl));

	const existingMethods = await sqlClient.paymentMethod.findMany({
		where: { isDeleted: false },
		select: { id: true, payUrl: true, name: true },
	});
	const existingByPayUrl = new Map(
		existingMethods.map((method) => [
			method.payUrl.trim().toLowerCase(),
			method,
		]),
	);

	const autoCreatedRows: string[] = [];
	for (const plugin of plugins) {
		if (existingByPayUrl.has(plugin.payUrl)) {
			continue;
		}

		let methodName = plugin.name;
		const nameConflict = await sqlClient.paymentMethod.findFirst({
			where: { name: methodName },
			select: { id: true },
		});
		if (nameConflict) {
			methodName = `${plugin.name} (${plugin.payUrl})`;
		}

		await sqlClient.paymentMethod.create({
			data: {
				name: methodName,
				payUrl: plugin.payUrl,
				priceDescr: plugin.description,
				fee: 0,
				feeAdditional: 0,
				clearDays: 3,
				isDeleted: false,
				isDefault: false,
				canDelete: false,
				visibleToCustomer: false,
				platformEnabled: false,
				createdAt: now,
				updatedAt: now,
			},
		});
		autoCreatedRows.push(plugin.payUrl);
		logger.info("Auto-created payment method row for plugin", {
			metadata: {
				payUrl: plugin.payUrl,
				name: methodName,
			},
			tags: ["payment", "plugin", "catalog", "autocreate"],
		});
	}

	const orphanMethods = existingMethods.filter(
		(method) => !pluginPayUrls.has(method.payUrl.trim().toLowerCase()),
	);
	const orphanMethodIds = orphanMethods.map((method) => method.id);
	let deletedMethods = 0;
	let deletedMappings = 0;
	if (orphanMethodIds.length > 0) {
		await sqlClient.$transaction(async (tx) => {
			const mappingDeleteResult = await tx.storePaymentMethodMapping.deleteMany(
				{
					where: { methodId: { in: orphanMethodIds } },
				},
			);
			const methodDeleteResult = await tx.paymentMethod.deleteMany({
				where: { id: { in: orphanMethodIds } },
			});
			deletedMappings = mappingDeleteResult.count;
			deletedMethods = methodDeleteResult.count;
		});
	}

	const refreshedMethods = await sqlClient.paymentMethod.findMany({
		where: { isDeleted: false },
		select: { payUrl: true },
	});
	const remainingMismatches = refreshedMethods
		.map((method) => method.payUrl.trim().toLowerCase())
		.filter((payUrl) => payUrl !== "" && !pluginPayUrls.has(payUrl));

	logger.info("Synchronized payment catalog with plugins", {
		metadata: {
			autoCreatedRows,
			deletedMethods,
			deletedMappings,
			keptMethods: refreshedMethods.length,
			remainingMismatches,
		},
		tags: ["payment", "plugin", "catalog", "sync"],
	});

	return {
		autoCreatedRows,
		deletedMethods,
		deletedMappings,
		keptMethods: refreshedMethods.length,
		remainingMismatches,
	};
}

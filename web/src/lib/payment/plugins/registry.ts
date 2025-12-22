import type { PaymentMethodPlugin } from "./types";

/**
 * Payment Method Plugin Registry
 *
 * Registry for all installed payment method plugins.
 * Plugins are registered by their identifier and can be retrieved by identifier.
 */
class PaymentPluginRegistry {
	private plugins: Map<string, PaymentMethodPlugin> = new Map();

	/**
	 * Register a payment method plugin
	 */
	register(plugin: PaymentMethodPlugin): void {
		if (this.plugins.has(plugin.identifier)) {
			throw new Error(
				`Payment plugin with identifier "${plugin.identifier}" is already registered`,
			);
		}
		this.plugins.set(plugin.identifier, plugin);
	}

	/**
	 * Get a plugin by identifier
	 */
	get(identifier: string): PaymentMethodPlugin | undefined {
		return this.plugins.get(identifier);
	}

	/**
	 * Check if a plugin is registered
	 */
	has(identifier: string): boolean {
		return this.plugins.has(identifier);
	}

	/**
	 * Get all registered plugins
	 */
	getAll(): PaymentMethodPlugin[] {
		return Array.from(this.plugins.values());
	}

	/**
	 * Get all plugin identifiers
	 */
	getIdentifiers(): string[] {
		return Array.from(this.plugins.keys());
	}

	/**
	 * Unregister a plugin (for testing or dynamic loading)
	 */
	unregister(identifier: string): boolean {
		return this.plugins.delete(identifier);
	}

	/**
	 * Clear all plugins (for testing)
	 */
	clear(): void {
		this.plugins.clear();
	}
}

// Singleton instance
export const paymentPluginRegistry = new PaymentPluginRegistry();

/**
 * Get a payment method plugin by identifier
 */
export function getPaymentPlugin(
	identifier: string,
): PaymentMethodPlugin | undefined {
	return paymentPluginRegistry.get(identifier);
}

/**
 * Register a payment method plugin
 */
export function registerPaymentPlugin(plugin: PaymentMethodPlugin): void {
	paymentPluginRegistry.register(plugin);
}

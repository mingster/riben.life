import type { PaymentMethod } from "@prisma/client";

import "@/lib/payment/plugins";
import {
	getPaymentPlugin,
	paymentPluginRegistry,
} from "@/lib/payment/plugins/registry";
import type { PaymentMethodPlugin } from "@/lib/payment/plugins/types";
import { synchronizePaymentMethodCatalogFromPlugins } from "@/lib/payment/plugins/loader";
import { sqlClient } from "@/lib/prismadb";
import { normalizePayUrl } from "@/lib/payment/normalize-pay-url";
import { StoreLevel } from "@/types/enum";

export { normalizePayUrl };

export type ResolveShopCheckoutPaymentErrorCode =
	| "UNKNOWN_METHOD"
	| "PLATFORM_DISABLED"
	| "PLUGIN_NOT_REGISTERED"
	| "STORE_NOT_ALLOWED"
	| "NOT_VISIBLE_TO_CUSTOMER";

export type ResolveShopCheckoutPaymentResult =
	| {
			ok: true;
			paymentMethod: PaymentMethod;
			plugin: PaymentMethodPlugin;
	  }
	| {
			ok: false;
			code: ResolveShopCheckoutPaymentErrorCode;
			message: string;
	  };

/**
 * Whether the store may use this payment method row, matching {@link get-store} /
 * {@link getStoreForOrderEdit}: empty mappings ⇒ all `isDefault` methods apply;
 * otherwise an explicit mapping is required.
 */
async function storeAllowsPaymentMethod(
	storeId: string,
	methodId: string,
	methodIsDefault: boolean,
): Promise<boolean> {
	const mappingCount = await sqlClient.storePaymentMethodMapping.count({
		where: { storeId },
	});
	if (mappingCount === 0) {
		return methodIsDefault;
	}
	const mapping = await sqlClient.storePaymentMethodMapping.findFirst({
		where: { storeId, methodId },
		select: { id: true },
	});
	return mapping !== null;
}

/**
 * Resolves a shop checkout payment processor: DB catalog + platform flag + plugin
 * registry + store eligibility + customer visibility.
 */
export async function resolveShopCheckoutPayment(
	storeId: string,
	payUrlRaw: string,
): Promise<ResolveShopCheckoutPaymentResult> {
	await synchronizePaymentMethodCatalogFromPlugins();

	const payUrl = normalizePayUrl(payUrlRaw);
	if (!payUrl) {
		return {
			ok: false,
			code: "UNKNOWN_METHOD",
			message: "Payment method is required.",
		};
	}

	const paymentMethod = await sqlClient.paymentMethod.findFirst({
		where: {
			payUrl: { equals: payUrl, mode: "insensitive" },
			isDeleted: false,
		},
		orderBy: { name: "asc" },
	});

	if (!paymentMethod) {
		return {
			ok: false,
			code: "UNKNOWN_METHOD",
			message: "This payment method is not available.",
		};
	}

	if (!paymentMethod.platformEnabled) {
		return {
			ok: false,
			code: "PLATFORM_DISABLED",
			message: "This payment processor is disabled by the platform.",
		};
	}

	const plugin = getPaymentPlugin(payUrl);
	if (!plugin) {
		return {
			ok: false,
			code: "PLUGIN_NOT_REGISTERED",
			message: "This payment processor is not installed.",
		};
	}

	if (!paymentMethod.visibleToCustomer) {
		return {
			ok: false,
			code: "NOT_VISIBLE_TO_CUSTOMER",
			message: "This payment method is not available for checkout.",
		};
	}

	const allowed = await storeAllowsPaymentMethod(
		storeId,
		paymentMethod.id,
		paymentMethod.isDefault,
	);
	if (!allowed) {
		return {
			ok: false,
			code: "STORE_NOT_ALLOWED",
			message: "This store does not accept this payment method.",
		};
	}

	return { ok: true, paymentMethod, plugin };
}

export interface ShopCheckoutPaymentOption {
	payUrl: string;
	name: string;
}

/**
 * Payment methods the storefront may offer for D2C checkout (subject to env / LINE Pay config).
 */
export async function listShopCheckoutPaymentMethodRows(
	storeId: string,
): Promise<PaymentMethod[]> {
	await synchronizePaymentMethodCatalogFromPlugins();

	const store = await sqlClient.store.findFirst({
		where: { id: storeId, isDeleted: false },
		select: { id: true, level: true },
	});
	if (!store) {
		return [];
	}

	const pluginIdentifiers = paymentPluginRegistry.getIdentifiers();
	const pluginPayUrls = pluginIdentifiers.map(normalizePayUrl);

	const candidates = await sqlClient.paymentMethod.findMany({
		where: {
			isDeleted: false,
			platformEnabled: true,
			visibleToCustomer: true,
			payUrl: { in: pluginPayUrls },
		},
	});

	const out: PaymentMethod[] = [];
	for (const pm of candidates) {
		const payUrl = normalizePayUrl(pm.payUrl);
		if (!getPaymentPlugin(payUrl)) {
			continue;
		}
		if (store.level === StoreLevel.Free && payUrl === "cash") {
			continue;
		}
		const allowed = await storeAllowsPaymentMethod(
			storeId,
			pm.id,
			pm.isDefault,
		);
		if (!allowed) {
			continue;
		}
		out.push(pm);
	}

	return out;
}

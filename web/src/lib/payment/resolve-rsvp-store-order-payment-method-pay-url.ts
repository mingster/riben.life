import { getT } from "@/app/i18n";
import { isCheckoutEligiblePayUrl } from "@/lib/payment/online-checkout-pay-urls";
import "@/lib/payment/plugins";
import { paymentPluginRegistry } from "@/lib/payment/plugins/registry";
import type { PrismaClient } from "@prisma/client";

import { SafeError } from "@/utils/error";
import { normalizePayUrl } from "@/lib/payment/resolve-shop-checkout-payment";

/** Transaction client used by RSVP store order creation. */
export type RsvpStoreOrderTx = Omit<
	PrismaClient,
	"$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Resolves which {@link PaymentMethod.payUrl} to attach to an unpaid RSVP checkout order.
 * Uses customer credit when enabled; otherwise the first store-mapped online method
 * eligible for `/checkout` (Stripe, LINE Pay, PayPal).
 */
export async function resolveRsvpStoreOrderPaymentMethodPayUrl(
	tx: RsvpStoreOrderTx,
	storeId: string,
	useCustomerCredit: boolean,
): Promise<string> {
	if (useCustomerCredit) {
		return "creditPoint";
	}

	const pluginPayUrls = paymentPluginRegistry
		.getIdentifiers()
		.map(normalizePayUrl);
	const paymentMethods = await tx.paymentMethod.findMany({
		where: {
			isDeleted: false,
			visibleToCustomer: true,
			platformEnabled: true,
			payUrl: { in: pluginPayUrls },
		},
		select: {
			id: true,
			payUrl: true,
			isDefault: true,
		},
		orderBy: { name: "asc" },
	});
	const mappings = await tx.storePaymentMethodMapping.findMany({
		where: {
			storeId,
		},
		select: {
			methodId: true,
		},
	});
	const hasMappings = mappings.length > 0;
	const mappedMethodIds = new Set(mappings.map((mapping) => mapping.methodId));

	for (const method of paymentMethods) {
		const payUrl = normalizePayUrl(method.payUrl);
		if (!payUrl || !isCheckoutEligiblePayUrl(payUrl)) {
			continue;
		}
		const allowed = hasMappings
			? mappedMethodIds.has(method.id)
			: method.isDefault;
		if (!allowed) {
			continue;
		}
		return payUrl;
	}

	const { t } = await getT();
	throw new SafeError(
		t("rsvp_no_online_payment_method") ||
			"No online payment method is configured for this store.",
	);
}

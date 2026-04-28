import { getT } from "@/app/i18n";
import { isCheckoutEligiblePayUrl } from "@/lib/payment/online-checkout-pay-urls";
import type { PrismaClient } from "@prisma/client";

import { SafeError } from "@/utils/error";

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

	const mappings = await tx.storePaymentMethodMapping.findMany({
		where: {
			storeId,
			PaymentMethod: {
				isDeleted: false,
				visibleToCustomer: true,
				platformEnabled: true,
			},
		},
		include: { PaymentMethod: true },
		orderBy: { id: "asc" },
	});

	for (const mapping of mappings) {
		const payUrl = mapping.PaymentMethod.payUrl;
		if (!payUrl || !isCheckoutEligiblePayUrl(payUrl)) {
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

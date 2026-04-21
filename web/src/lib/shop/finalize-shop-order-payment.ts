import { sqlClient } from "@/lib/prismadb";
import { PaymentStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { queueShopOrderConfirmationEmail } from "@/lib/mail/queue-shop-order-confirmation";

/**
 * Marks a shop order paid (idempotent) and queues the confirmation email once.
 */
export async function markShopOrderPaidAndNotify(
	orderId: string,
	checkoutRef?: string,
): Promise<void> {
	const order = await sqlClient.storeOrder.findUnique({
		where: { id: orderId },
		select: { id: true, isPaid: true },
	});
	if (!order) {
		return;
	}

	if (order.isPaid) {
		await queueShopOrderConfirmationEmail(orderId);
		return;
	}

	const now = getUtcNowEpoch();
	await sqlClient.storeOrder.update({
		where: { id: orderId },
		data: {
			isPaid: true,
			paidDate: now,
			paymentStatus: PaymentStatus.Paid,
			...(checkoutRef !== undefined && checkoutRef.length > 0
				? { checkoutRef }
				: {}),
			updatedAt: now,
		},
	});

	await queueShopOrderConfirmationEmail(orderId);
}

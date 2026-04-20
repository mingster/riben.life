"use server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { StoreLevel } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const deleteAllData = async () => {
	// Delete all data in sequence
	// Delete ledgers first (before credits) to avoid any potential foreign key issues
	const [
		customerCreditLedgerCount,
		customerFiatLedgerCount,
		storeLedgerCount,
		storeOrderCount,
		ticketCount,
		rsvpCount,
		rsvpBlacklistCount,
		rsvpTagCount,
		deliveryStatusCount,
		messageQueueCount,
		emailQueueCount,
		subscriptionPaymentCount,
		storeSubscriptionCount,
	] = await Promise.all([
		sqlClient.customerCreditLedger.deleteMany({ where: {} }),
		sqlClient.customerFiatLedger.deleteMany({ where: {} }),
		sqlClient.storeLedger.deleteMany({ where: {} }),
		sqlClient.storeOrder.deleteMany({ where: {} }),
		sqlClient.supportTicket.deleteMany({ where: {} }),
		sqlClient.rsvp.deleteMany({ where: {} }),
		sqlClient.rsvpBlacklist.deleteMany({ where: {} }),
		sqlClient.rsvpTag.deleteMany({ where: {} }),
		sqlClient.notificationDeliveryStatus.deleteMany({ where: {} }),
		sqlClient.messageQueue.deleteMany({ where: {} }),
		sqlClient.emailQueue.deleteMany({ where: {} }),
		sqlClient.subscriptionPayment.deleteMany({ where: {} }),
		sqlClient.storeSubscription.deleteMany({ where: {} }),
	]);

	// Delete customer credits after ledgers
	const customerCreditCount = await sqlClient.customerCredit.deleteMany({
		where: {},
	});

	const storesResetToFree = await sqlClient.store.updateMany({
		where: { level: { in: [StoreLevel.Pro, StoreLevel.Multi] } },
		data: { level: StoreLevel.Free, updatedAt: getUtcNowEpoch() },
	});

	logger.info("Deleted all data", {
		metadata: {
			storeLedgerCount: storeLedgerCount.count,
			storeOrderCount: storeOrderCount.count,
			ticketCount: ticketCount.count,
			customerCreditLedgerCount: customerCreditLedgerCount.count,
			customerCreditCount: customerCreditCount.count,
			customerFiatLedgerCount: customerFiatLedgerCount.count,
			rsvpCount: rsvpCount.count,
			rsvpBlacklistCount: rsvpBlacklistCount.count,
			rsvpTagCount: rsvpTagCount.count,
			deliveryStatusCount: deliveryStatusCount.count,
			messageQueueCount: messageQueueCount.count,
			emailQueueCount: emailQueueCount.count,
			subscriptionPaymentCount: subscriptionPaymentCount.count,
			storeSubscriptionCount: storeSubscriptionCount.count,
			storesResetToFree: storesResetToFree.count,
		},
		tags: ["action", "maintenance", "delete-all"],
	});

	//

	return {
		storeLedgerCount: storeLedgerCount.count,
		storeOrderCount: storeOrderCount.count,
		ticketCount: ticketCount.count,
		customerCreditLedgerCount: customerCreditLedgerCount.count,
		customerCreditCount: customerCreditCount.count,
		customerFiatLedgerCount: customerFiatLedgerCount.count,
		rsvpCount: rsvpCount.count,
		rsvpBlacklistCount: rsvpBlacklistCount.count,
		rsvpTagCount: rsvpTagCount.count,
		deliveryStatusCount: deliveryStatusCount.count,
		messageQueueCount: messageQueueCount.count,
		emailQueueCount: emailQueueCount.count,
		subscriptionPaymentCount: subscriptionPaymentCount.count,
		storeSubscriptionCount: storeSubscriptionCount.count,
		storesResetToFree: storesResetToFree.count,
	};
};

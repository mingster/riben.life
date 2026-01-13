"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";

export const deleteAllData = async () => {
	// Delete all data in sequence
	const [
		storeLedgerCount,
		storeOrderCount,
		ticketCount,
		customerCreditLedgerCount,
		customerCreditCount,
		customerFiatLedgerCount,
		rsvpCount,
		rsvpBlacklistCount,
		rsvpTagCount,
		deliveryStatusCount,
		messageQueueCount,
		emailQueueCount,
	] = await Promise.all([
		sqlClient.storeLedger.deleteMany({ where: {} }),
		sqlClient.storeOrder.deleteMany({ where: {} }),
		sqlClient.supportTicket.deleteMany({ where: {} }),
		sqlClient.customerCreditLedger.deleteMany({ where: {} }),
		sqlClient.customerCredit.deleteMany({ where: {} }),
		sqlClient.customerFiatLedger.deleteMany({ where: {} }),
		sqlClient.rsvp.deleteMany({ where: {} }),
		sqlClient.rsvpBlacklist.deleteMany({ where: {} }),
		sqlClient.rsvpTag.deleteMany({ where: {} }),
		sqlClient.notificationDeliveryStatus.deleteMany({ where: {} }),
		sqlClient.messageQueue.deleteMany({ where: {} }),
		sqlClient.emailQueue.deleteMany({ where: {} }),
	]);

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
		},
		tags: ["action", "maintenance", "delete-all"],
	});

	redirect("/sysAdmin/maint");

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
	};
};

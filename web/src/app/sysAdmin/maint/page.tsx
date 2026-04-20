import { promises as fs } from "node:fs";
import { redirect } from "next/navigation";
import { cache } from "react";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus, StoreLevel } from "@/types/enum";
import { checkAdminAccess } from "../admin-utils";
import { ClientMaintenance } from "./components/client-maintenance";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";

/**
 * Data Maintenance Page
 *
 * Provides administrative tools for managing and deleting data.
 * ONLY USE THIS IN DEVELOPMENT.
 */
export default async function StoreAdminDevMaintPage() {
	const isAdmin = (await checkAdminAccess()) as boolean;
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	// Parallelize all count queries for better performance
	const [
		storeOrderCount,
		storeLedgerCount,
		ticketCount,
		customerCreditLedgerCount,
		customerCreditCount,
		customerFiatLedgerCount,
		rsvpCount,
		rsvpBlacklistCount,
		rsvpTagCount,
		messageQueueCount,
		emailQueueCount,
		notificationDeliveryStatusCount,
		systemLogsCount,
		unpaidRsvpCount,
		storeSubscriptionCount,
		subscriptionPaymentCount,
		paidTierStoreCount,
	] = await Promise.all([
		sqlClient.storeOrder.count(),
		sqlClient.storeLedger.count(),
		sqlClient.supportTicket.count(),
		sqlClient.customerCreditLedger.count(),
		sqlClient.customerCredit.count(),
		sqlClient.customerFiatLedger.count(),
		sqlClient.rsvp.count(),
		sqlClient.rsvpBlacklist.count(),
		sqlClient.rsvpTag.count(),
		sqlClient.messageQueue.count(),
		sqlClient.emailQueue.count(),
		sqlClient.notificationDeliveryStatus.count(),
		sqlClient.system_logs.count(),
		sqlClient.rsvp.count({
			where: {
				alreadyPaid: false,
				confirmedByStore: false,
				status: {
					in: [RsvpStatus.Pending, RsvpStatus.ReadyToConfirm],
				},
			},
		}),
		sqlClient.storeSubscription.count(),
		sqlClient.subscriptionPayment.count(),
		sqlClient.store.count({
			where: { level: { in: [StoreLevel.Pro, StoreLevel.Multi] } },
		}),
	]);
	/*
//debug - select all unpaid rsvps
const unpaidRsvps = await sqlClient.rsvp.findMany({
	where: {
		alreadyPaid: false,
		confirmedByStore: false,

	},
});
transformBigIntToNumbers(unpaidRsvps);
console.log(JSON.stringify(unpaidRsvps, null, 2));
*/
	// Read default files in parallel with error handling
	const [tos, privacyPolicy] = await Promise.all([
		readDefaultFile("terms.md").catch(() => ""),
		readDefaultFile("privacy.md").catch(() => ""),
	]);

	const maintenanceData = {
		storeOrderCount,
		storeLedgerCount,
		ticketCount,
		customerCreditLedgerCount,
		customerCreditCount,
		customerFiatLedgerCount,
		rsvpCount,
		rsvpBlacklistCount,
		rsvpTagCount,
		messageQueueCount,
		emailQueueCount,
		notificationDeliveryStatusCount,
		systemLogsCount,
		unpaidRsvpCount,
		storeSubscriptionCount,
		subscriptionPaymentCount,
		paidTierStoreCount,
	};

	return (
		<Container>
			<Heading
				title="Data Maintenance"
				description="Manage store data -- ONLY DO this in development."
			/>

			<ClientMaintenance data={maintenanceData} />

			<EditDefaultPrivacy data={privacyPolicy} />
			<EditDefaultTerms data={tos} />
		</Container>
	);
}

/**
 * Read default file from public/defaults directory
 * Cached to avoid re-reading on every request
 */
const readDefaultFile = cache(async (filename: string): Promise<string> => {
	try {
		const filePath = `${process.cwd()}/public/defaults/${filename}`;
		return await fs.readFile(filePath, "utf8");
	} catch {
		// Return empty string if file doesn't exist or can't be read
		return "";
	}
});

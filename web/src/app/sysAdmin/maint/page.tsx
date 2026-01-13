import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { checkAdminAccess } from "../admin-utils";
import { Heading } from "@/components/ui/heading";
import { redirect } from "next/navigation";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";
import { promises as fs } from "node:fs";
import { cache } from "react";
import { ClientMaintenance } from "./components/client-maintenance";

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
	]);

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
	} catch (error) {
		// Return empty string if file doesn't exist or can't be read
		return "";
	}
});

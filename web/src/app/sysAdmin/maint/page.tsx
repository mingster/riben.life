import { promises as fs } from "node:fs";
import { redirect } from "next/navigation";
import { cache } from "react";
import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus, StoreLevel } from "@/types/enum";
import { checkAdminAccess } from "../admin-utils";
import { ClientMaintenance } from "./components/client-maintenance";
import { MaintSubscriptionSummary } from "./components/maint-subscription-summary";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";
import {
	rollupGlobalStoreSubscriptions,
	type SubscriptionStatusGroupRow,
} from "./maint-column";

/**
 * Data Maintenance Page
 *
 * Provides administrative tools for managing and deleting data.
 * ONLY USE THIS IN DEVELOPMENT.
 */
export default async function SysAdminMaintPage() {
	const isAdmin = (await checkAdminAccess()) as boolean;
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

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
		storeCount,
		subscriptionStatusGroups,
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
		sqlClient.store.count(),
		sqlClient.storeSubscription.groupBy({
			by: ["status"],
			_count: { _all: true },
		}),
		sqlClient.subscriptionPayment.count(),
		sqlClient.store.count({
			where: { level: { in: [StoreLevel.Pro, StoreLevel.Multi] } },
		}),
	]);

	const groups = subscriptionStatusGroups as SubscriptionStatusGroupRow[];
	const storeSubscriptionRowCount = groups.reduce(
		(acc, row) => acc + row._count._all,
		0,
	);

	const subscriptionStats = rollupGlobalStoreSubscriptions(storeCount, groups);

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
		storeSubscriptionCount: storeSubscriptionRowCount,
		subscriptionPaymentCount,
		paidTierStoreCount,
	};

	return (
		<Suspense fallback={<Loader />}>
			<Container className="space-y-8">
				<div>
					<h1 className="mb-4 text-xl font-semibold">Data maintenance</h1>
					<p className="text-muted-foreground mb-6 text-sm">
						Dangerous cleanup tools and default legal files — use only in controlled
						environments (e.g. development).
					</p>
				</div>

				<MaintSubscriptionSummary
					storeCount={storeCount}
					stats={subscriptionStats}
					storeSubscriptionRowCount={storeSubscriptionRowCount}
					subscriptionPaymentCount={subscriptionPaymentCount}
					paidTierStoreCount={paidTierStoreCount}
				/>

				<section className="space-y-3">
					<h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
						Data cleanup
					</h2>
					<ClientMaintenance data={maintenanceData} />
				</section>

				<section className="space-y-4">
					<h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
						Default legal content
					</h2>
					<div className="space-y-6">
						<EditDefaultPrivacy data={privacyPolicy} />
						<EditDefaultTerms data={tos} />
					</div>
				</section>
			</Container>
		</Suspense>
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
		return "";
	}
});

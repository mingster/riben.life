"use server";

import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { IconSend, IconTrash } from "@tabler/icons-react";
import { checkAdminAccess } from "../admin-utils";
import { deleteAllLedgers } from "@/actions/sysAdmin/maint/delete-all-ledgers";
import { deleteAllOrders } from "@/actions/sysAdmin/maint/delete-all-orders";
import { deleteAllSupportTickets } from "@/actions/sysAdmin/maint/delete-all-support-tickets";
import { deleteAllCustomerCredits } from "@/actions/sysAdmin/maint/delete-all-customer-credits";
import { deleteAllRsvp } from "@/actions/sysAdmin/maint/delete-all-rsvp";
import { sendTestNoficiation } from "@/actions/sysAdmin/maint/send-test-noficiation";
import { Heading } from "@/components/ui/heading";
import { redirect } from "next/navigation";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";
import { promises as fs } from "node:fs";
import { cache } from "react";

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
		rsvpCount,
		rsvpBlacklistCount,
		rsvpTagCount,
	] = await Promise.all([
		sqlClient.storeOrder.count(),
		sqlClient.storeLedger.count(),
		sqlClient.supportTicket.count(),
		sqlClient.customerCreditLedger.count(),
		sqlClient.customerCredit.count(),
		sqlClient.rsvp.count(),
		sqlClient.rsvpBlacklist.count(),
		sqlClient.rsvpTag.count(),
	]);

	// Read default files in parallel with error handling
	const [tos, privacyPolicy] = await Promise.all([
		readDefaultFile("terms.md").catch(() => ""),
		readDefaultFile("privacy.md").catch(() => ""),
	]);
	return (
		<Container>
			<Heading
				title="Data Maintenance"
				description="Manage store data -- ONLY DO this in development."
			/>

			<div className="flex flex-row flex-wrap gap-3 pb-2">
				<div className="relative inline-flex items-center">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
						{storeLedgerCount}
					</span>
					<Button
						onClick={deleteAllLedgers}
						type="button"
						variant="destructive"
						className="disabled:opacity-50"
						size="sm"
						{...(storeLedgerCount === 0 && { disabled: true })}
					>
						<IconTrash className="size-4 mr-1" /> Delete all Ledger data
					</Button>
				</div>

				<div className="relative inline-flex items-center">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
						{storeOrderCount}
					</span>
					<Button
						onClick={deleteAllOrders}
						type="button"
						variant="destructive"
						className="disabled:opacity-50"
						size="sm"
						{...(storeOrderCount === 0 && { disabled: true })}
					>
						<IconTrash className="size-4 mr-1" /> Delete all order data
					</Button>
				</div>

				<div className="relative inline-flex items-center">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
						{ticketCount}
					</span>
					<Button
						onClick={deleteAllSupportTickets}
						type="button"
						variant="destructive"
						className="disabled:opacity-50"
						size="sm"
						{...(ticketCount === 0 && { disabled: true })}
					>
						<IconTrash className="size-4 mr-1" /> Delete all Support Ticket data
					</Button>
				</div>

				<div className="relative inline-flex items-center">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
						{customerCreditLedgerCount + customerCreditCount}
					</span>
					<Button
						onClick={deleteAllCustomerCredits}
						type="button"
						variant="destructive"
						className="disabled:opacity-50"
						size="sm"
						{...(customerCreditLedgerCount === 0 &&
							customerCreditCount === 0 && { disabled: true })}
					>
						<IconTrash className="size-4 mr-1" /> Delete all Customer Credit
						data
					</Button>
				</div>

				<div className="relative inline-flex items-center">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1 z-10">
						{rsvpCount + rsvpBlacklistCount + rsvpTagCount}
					</span>
					<Button
						onClick={deleteAllRsvp}
						type="button"
						variant="destructive"
						className="disabled:opacity-50"
						size="sm"
						{...(rsvpCount === 0 &&
							rsvpBlacklistCount === 0 &&
							rsvpTagCount === 0 && { disabled: true })}
					>
						<IconTrash className="size-4 mr-1" /> Delete all RSVP data
					</Button>
				</div>

				<Button
					onClick={sendTestNoficiation}
					type="button"
					variant="default"
					className="disabled:opacity-50"
					size="sm"
				>
					<IconSend className="size-4 mr-1" /> Send test nofication
				</Button>
			</div>

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

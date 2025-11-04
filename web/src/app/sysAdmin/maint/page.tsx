"use server";

import { wipeoutDefaultData } from "@/actions/admin/populate-payship_defaults";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { IconDiamond, IconSend, IconTrash } from "@tabler/icons-react";
import { checkAdminAccess } from "../admin-utils";

import fs from "node:fs";
import { deleteAllLedgers } from "@/actions/admin/maint/delete-all-ledgers";
import { deleteAllOrders } from "@/actions/admin/maint/delete-all-orders";
import { deleteAllSupportTickets } from "@/actions/admin/maint/delete-all-support-tickets";
import { sendTestNoficiation } from "@/actions/admin/maint/send-test-noficiation";
import { Heading } from "@/components/ui/heading";
import { redirect } from "next/navigation";
import { EditDefaultPrivacy } from "./edit-default-privacy";
import { EditDefaultTerms } from "./edit-default-terms";
import logger from "@/lib/logger";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// DashboardPage is home of the selected store. It diesplays store operatiing stat such as
//total revenue, sales count, products, etc..
export default async function StoreAdminDevMaintPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const _params = await props.params;

	const isAdmin = (await checkAdminAccess()) as boolean;
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");

	const _deleteAllShippingMethods = async () => {
		"use server";

		await sqlClient.shippingMethodPrice.deleteMany({});
		await sqlClient.storeShipMethodMapping.deleteMany({});
		//await sqlClient.shippingMethodPrice.deleteMany({});

		const { count } = await sqlClient.shippingMethod.deleteMany({
			where: {
				//storeId: params.storeId,
			},
		});
		logger.info("Operation log");

		redirect("./admin/maint");
	};

	const _deleteAllPaymentMethods = async () => {
		"use server";

		const { count } = await sqlClient.paymentMethod.deleteMany({
			where: {
				//storeId: params.storeId,
			},
		});
		logger.info("Operation log");
		redirect("./admin/maint");
	};

	const storeOrderCount = await sqlClient.storeOrder.count();
	logger.info("Operation log");

	const storeLedgerCount = await sqlClient.storeLedger.count();
	logger.info("Operation log");

	const ticketCount = await sqlClient.supportTicket.count();
	logger.info("Operation log");

	// populate defaults: privacy policy and terms of service
	//
	const termsfilePath = `${process.cwd()}/public/defaults/terms.md`;
	const tos = fs.readFileSync(termsfilePath, "utf8");

	const privacyfilePath = `${process.cwd()}/public/defaults/privacy.md`;
	const privacyPolicy = fs.readFileSync(privacyfilePath, "utf8");

	//console.log(tos);

	//<MaintClient storeId={store.id} />
	return (
		<Container>
			<Heading
				title="Data Maintenance"
				description="Manage store data -- ONLY DO this in development."
			/>

			<div className="flex flex-row gap-3 pb-2">
				<div className="relative inline-flex items-center rounded">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1">
						<span className="z-10">{storeLedgerCount}</span>
					</span>
					<Button
						onClick={deleteAllLedgers}
						type="button"
						variant="destructive"
						className="disabled:opacity-50 z-0"
						size="sm"
						{...(storeLedgerCount === 0 && { disabled: true })}
					>
						<IconTrash className="size-4 mr-1" /> Delete all Ledger data
					</Button>
				</div>

				<div className="relative inline-flex items-center rounded">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1">
						<span className="z-10">{storeOrderCount}</span>
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

				<div className="relative inline-flex items-center rounded">
					<span className="absolute -top-1 -right-2 size-5 rounded-full bg-slate-900 text-slate-100 flex justify-center items-center text-xs pb-1">
						<span className="z-10">{ticketCount}</span>
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

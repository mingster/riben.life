"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";

export const deleteAllCustomerFiatLedgers = async () => {
	// Delete all customer fiat ledgers
	const ledgerCount = await sqlClient.customerFiatLedger.deleteMany({
		where: {},
	});

	logger.info("Deleted all customer fiat ledger data", {
		metadata: {
			ledgerCount: ledgerCount.count,
		},
		tags: ["action", "maintenance", "customer-fiat-ledger"],
	});

	redirect("/sysAdmin/maint");

	return {
		ledgerCount: ledgerCount.count,
	};
};

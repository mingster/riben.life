"use server";
import { sqlClient } from "@/lib/prismadb";
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

	return {
		ledgerCount: ledgerCount.count,
	};
};

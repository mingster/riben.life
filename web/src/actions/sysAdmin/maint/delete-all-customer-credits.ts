"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllCustomerCredits = async () => {
	// Delete all customer credit ledgers first (due to foreign key constraints)
	const ledgerCount = await sqlClient.customerCreditLedger.deleteMany({
		where: {},
	});

	// Delete all customer credits
	const creditCount = await sqlClient.customerCredit.deleteMany({
		where: {},
	});

	logger.info("Deleted all customer credit data", {
		metadata: {
			ledgerCount: ledgerCount.count,
			creditCount: creditCount.count,
		},
		tags: ["action", "maintenance", "customer-credit"],
	});

	return {
		ledgerCount: ledgerCount.count,
		creditCount: creditCount.count,
	};
};

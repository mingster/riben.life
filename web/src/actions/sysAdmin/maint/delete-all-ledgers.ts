"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllLedgers = async () => {
	const { count } = await sqlClient.storeLedger.deleteMany({
		where: {},
	});

	logger.info("Deleted all store ledgers", {
		metadata: {
			deletedCount: count,
		},
		tags: ["action", "maintenance", "ledgers"],
	});

	return count;
};

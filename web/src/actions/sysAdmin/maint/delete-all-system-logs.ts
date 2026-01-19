"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllSystemLogs = async () => {
	const { count } = await sqlClient.system_logs.deleteMany({
		where: {},
	});

	logger.info("Deleted all system logs", {
		metadata: {
			deletedCount: count,
		},
		tags: ["action", "maintenance", "system-logs"],
	});

	return count;
};

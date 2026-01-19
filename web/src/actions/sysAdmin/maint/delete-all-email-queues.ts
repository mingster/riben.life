"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllEmailQueues = async () => {
	const { count } = await sqlClient.emailQueue.deleteMany({
		where: {},
	});

	logger.info("Deleted all email queues", {
		metadata: {
			deletedCount: count,
		},
		tags: ["action", "maintenance", "email-queues"],
	});

	return count;
};

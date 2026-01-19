"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllMessageQueues = async () => {
	const { count } = await sqlClient.messageQueue.deleteMany({
		where: {},
	});

	logger.info("Deleted all message queues", {
		metadata: {
			deletedCount: count,
		},
		tags: ["action", "maintenance", "message-queues"],
	});

	return count;
};

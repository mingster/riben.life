"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
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

	redirect("/sysAdmin/maint");

	return count;
};

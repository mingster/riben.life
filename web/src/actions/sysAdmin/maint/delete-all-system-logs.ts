"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
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

	redirect("/sysAdmin/maint");

	return count;
};

"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";
import logger from "@/lib/logger";

export const deleteAllSupportTickets = async () => {
	"use server";

	const { count } = await sqlClient.supportTicket.deleteMany({
		where: {
			//storeId: params.storeId,
		},
	});

	logger.info("Operation log", {
		tags: ["action"],
	});
	redirect("/admin/maint");

	return count;
};

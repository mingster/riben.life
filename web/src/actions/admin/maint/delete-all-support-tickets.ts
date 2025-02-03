"use server";
import { sqlClient } from "@/lib/prismadb";
import { redirect } from "next/navigation";

export const deleteAllSupportTickets = async () => {
	"use server";

	const { count } = await sqlClient.supportTicket.deleteMany({
		where: {
			//storeId: params.storeId,
		},
	});

	console.log(`${count} tickets deleted.`);
	redirect("/admin/maint");

	return count;
};

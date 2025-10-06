"use server";

import { sqlClient } from "@/lib/prismadb";
import type { SupportTicket } from "@/types";

import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { getUtcNow } from "@/utils/datetime-utils";
import { updateTicketSchema } from "./update-ticket.validation";

export const updateTicketAction = userRequiredActionClient
	.metadata({ name: "updateTicket" })
	.schema(updateTicketSchema)
	.action(
		async ({
			parsedInput: {
				id,
				threadId,
				senderId,
				storeId,
				recipientId,
				priority,
				department,
				subject,
				message,
				status,
				creator,
				modifier,
			},
		}) => {

			if (id === undefined || id === null || id === "") {
				const result = await sqlClient.supportTicket.create({
					data: {
						threadId: threadId || "",
						senderId,
						storeId: storeId || "",
						recipientId,
						priority,
						department,
						subject,
						message,
						status,
						creator,
						createdAt: getUtcNow(),
						modifier,
						lastModified: getUtcNow(),
					},
				});
				id = result.id as unknown as string;

				if (threadId) {
					//update status for all tickets in the thread
					await sqlClient.supportTicket.updateMany({
						where: { threadId },
						data: { status },
					});
					// update the main ticket status
					await sqlClient.supportTicket.update({
						where: { id: threadId },
						data: { status },
					});
				}
			} else {
				await sqlClient.supportTicket.update({
					where: { id },
					data: {
						//threadId,
						senderId,
						storeId,
						recipientId,
						priority,
						department,
						subject,
						message,
						status,
						modifier,
						lastModified: getUtcNow(),
					},
				});
			}

			// return main ticket including thread if thread id is available
			// otherwise return the main ticket only
			const whereClause = threadId ? { id: threadId } : { id };

			const result = (await sqlClient.supportTicket.findFirst({
				where: whereClause,
				include: {
					Thread: true,
				},
			})) as SupportTicket;

			//logger.info("updateTicketAction", { result });

			return result;
		},
	);

"use server";

import type { SupportTicket } from "@/types";
import { TicketPriority } from "@/types/enum";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updateTicketSchema } from "./update-ticket.validation";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

export const updateTicketAdminAction = adminActionClient
	.metadata({ name: "updateTicket" })
	.schema(updateTicketSchema)
	.action(
		async ({
			parsedInput: {
				id,
				threadId,
				senderId,
				storeId,
				//priority,
				recipientId,
				department,
				subject,
				message,
				status,
				creator,
				modifier,
			},
		}) => {
			const priority = TicketPriority.Medium;

			//if there's no id, this is a new object
			//
			if (id === undefined || id === null || id === "") {
				const result = await sqlClient.supportTicket.create({
					data: {
						threadId: threadId || "",
						senderId,
						storeId,
						priority,
						recipientId,
						department,
						subject,
						message,
						status,
						creator,
						createdAt: getUtcNowEpoch(),
						modifier,
						lastModified: getUtcNowEpoch(),
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
						lastModified: getUtcNowEpoch(),
					},
				});
			}

			// return main ticket including thread if thread id is available
			// otherwise return the main ticket only
			const whereClause = threadId ? { id: threadId } : { id };

			const result = (await sqlClient.supportTicket.findFirst({
				where: whereClause,
				include: {
					Thread: {
						include: {
							Sender: true,
						},
					},
					Sender: true,
				},
			})) as SupportTicket;

			transformPrismaDataForJson(result);

			return result;
		},
	);

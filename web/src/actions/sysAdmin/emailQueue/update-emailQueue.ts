"use server";

import { sqlClient } from "@/lib/prismadb";
import type { EmailQueue } from "@/types";
import { adminActionClient } from "@/utils/actions/safe-action";
import { updateEmailQueueSchema } from "./update-emailQueue.validation";

export const updateEmailQueueAction = adminActionClient
	.metadata({ name: "updateEmailQueue" })
	.schema(updateEmailQueueSchema)
	.action(
		async ({
			parsedInput: {
				id,
				from,
				fromName,
				to,
				toName,
				cc,
				bcc,
				subject,
				textMessage,
				htmMessage,
				//sendTries,
				//sentOn,
			},
		}) => {
			//if there's no id, this is a new object
			//
			if (id === undefined || id === null || id === "" || id === "new") {
				const result = await sqlClient.emailQueue.create({
					data: {
						from: from || "",
						fromName: fromName || "",
						to: to || "",
						toName: toName || "",
						cc: cc || "",
						bcc: bcc || "",
						subject,
						textMessage,
						htmMessage,
						sendTries: 0,
						createdOn: new Date(),
						sentOn: null,
					},
				});
				id = result.id;
			} else {
				await sqlClient.emailQueue.update({
					where: { id },
					data: {
						from,
						fromName,
						to,
						toName,
						cc,
						bcc,
						subject,
						textMessage,
						htmMessage,
					},
				});
			}

			const result = (await sqlClient.emailQueue.findFirst({
				where: { id },
			})) as EmailQueue;

			return result;
		},
	);

"use server";

import { sqlClient } from "@/lib/prismadb";
import { userRequiredActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import logger from "@/lib/logger";
import { transformPrismaDataForJson } from "@/utils/utils";

const getUserNotificationsSchema = z.object({
	limit: z.number().int().min(1).max(50).default(20),
	offset: z.number().int().min(0).default(0),
});

export const getUserNotificationsAction = userRequiredActionClient
	.metadata({ name: "getUserNotifications" })
	.schema(getUserNotificationsSchema)
	.action(async ({ parsedInput, ctx }) => {
		const userId = ctx.userId;
		const { limit, offset } = parsedInput;

		const [notifications, totalCount] = await Promise.all([
			sqlClient.messageQueue.findMany({
				where: {
					recipientId: userId,
					isDeletedByRecipient: false,
				},
				include: {
					Sender: {
						select: {
							id: true,
							name: true,
							email: true,
							image: true,
						},
					},
					Store: {
						select: {
							id: true,
							name: true,
						},
					},
				},
				orderBy: {
					createdAt: "desc",
				},
				take: limit,
				skip: offset,
			}),
			sqlClient.messageQueue.count({
				where: {
					recipientId: userId,
					isDeletedByRecipient: false,
				},
			}),
		]);

		// Transform BigInt and Decimal to numbers for JSON serialization
		transformPrismaDataForJson(notifications);

		const unreadCount = await sqlClient.messageQueue.count({
			where: {
				recipientId: userId,
				isDeletedByRecipient: false,
				isRead: false,
			},
		});

		return {
			notifications,
			totalCount,
			unreadCount,
		};
	});

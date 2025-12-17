import { z } from "zod";

export const updateMessageQueueSchema = z.object({
	id: z.string(),
	senderId: z.string().min(1, "Sender ID is required"),
	recipientId: z.string().min(1, "Recipient ID is required"),
	storeId: z.string().optional().nullable(),
	subject: z.string().min(1, "Subject is required"),
	message: z.string().min(1, "Message is required"),
	notificationType: z.string().optional().nullable(),
	actionUrl: z.string().url().optional().nullable().or(z.literal("")),
	priority: z.coerce.number().int().min(0).max(2).default(0),
	isRead: z.boolean().default(false),
	isDeletedByAuthor: z.boolean().default(false),
	isDeletedByRecipient: z.boolean().default(false),
});

export type UpdateMessageQueueInput = z.infer<typeof updateMessageQueueSchema>;

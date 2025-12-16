import { z } from "zod";

export const updateEmailQueueSchema = z.object({
	id: z.string(),
	from: z.string().min(1, "from is required"),
	fromName: z.string().min(1, "fromName is required"),
	to: z.string().min(1, "to is required"),
	toName: z.string().min(1, "toName is required"),
	cc: z.string().optional(),
	bcc: z.string().optional(),
	subject: z.string().min(1, "subject is required"),
	textMessage: z.string().min(1, "textMessage is required"),
	htmMessage: z.string().min(1, "htmMessage is required"),
	sendTries: z.number().min(0).optional(),
	sentOn: z.date().optional(),
	storeId: z.string().optional().nullable(),
	notificationId: z.string().optional().nullable(),
	templateId: z.string().optional().nullable(),
	priority: z.coerce.number().int().min(0).max(2).default(0),
});

export type UpdateEmailQueueInput = z.infer<typeof updateEmailQueueSchema>;

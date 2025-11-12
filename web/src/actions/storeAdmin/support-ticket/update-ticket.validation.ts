import { z } from "zod";

export const updateTicketSchema = z.object({
	id: z.string(),
	threadId: z.string().optional(),
	senderId: z.string(),
	recipientId: z.string(),
	storeId: z.string(),
	//priority: z.number(),
	department: z.string().min(1, "department is required"),
	subject: z.string().min(1, "subject is required"),
	message: z.string().min(1, "message is required"),
	status: z.number(),
	creator: z.string(),
	modifier: z.string(),
	/*
	creationDate: z.date(),
	lastModified: z.date(),
	*/
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

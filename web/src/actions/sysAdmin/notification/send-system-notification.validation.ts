import { z } from "zod";

export const sendSystemNotificationSchema = z.object({
	recipientType: z.enum(["all", "selected"]),
	recipientIds: z.array(z.string()).optional(),
	channels: z
		.array(
			z.enum([
				"onsite",
				"email",
				"line",
				"whatsapp",
				"wechat",
				"sms",
				"telegram",
				"push",
			]),
		)
		.min(1, "At least one channel must be selected"),
	subject: z.string().min(1, "Subject is required"),
	message: z.string().min(1, "Message is required"),
	templateId: z.string().optional().nullable(),
	priority: z.enum(["0", "1", "2"]).default("0"), // 0=normal, 1=high, 2=urgent
	actionUrl: z.string().url().optional().nullable().or(z.literal("")),
});

export type SendSystemNotificationInput = z.infer<
	typeof sendSystemNotificationSchema
>;

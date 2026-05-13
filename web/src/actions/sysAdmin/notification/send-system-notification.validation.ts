import { z } from "zod";

export const sendSystemNotificationSchema = z
	.object({
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
		subject: z.string(),
		message: z.string(),
		templateId: z.string().optional().nullable(),
		/** When a template is selected, use sample placeholder data for this domain (sysAdmin test send). */
		templateSampleDomain: z
			.enum(["none", "order", "reservation", "subscription"])
			.default("none"),
		priority: z.enum(["0", "1", "2"]).default("0"), // 0=normal, 1=high, 2=urgent
	})
	.superRefine((data, ctx) => {
		const templateKey = data.templateId?.trim() ?? "";
		const hasTemplate = templateKey.length > 0;
		if (hasTemplate) {
			return;
		}
		if (data.subject.trim().length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "Subject is required without a template",
				path: ["subject"],
			});
		}
		if (data.message.trim().length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "Message is required without a template",
				path: ["message"],
			});
		}
	});

export type SendSystemNotificationInput = z.infer<
	typeof sendSystemNotificationSchema
>;

import { z } from "zod";

export const createFacilitiesSchema = z
	.object({
		prefix: z.string().trim().default(""),
		numOfFacilities: z.coerce.number().int().min(1).max(100),
		capacity: z.coerce.number().int().min(1),
		defaultCost: z.coerce.number().min(0, "Default Cost is required"),
		defaultCredit: z.coerce.number().min(0, "Default Credit is required"),
		defaultDuration: z.coerce
			.number()
			.int()
			.min(0, "Default Duration must be 0 or greater"),
		useOwnBusinessHours: z.boolean().optional().default(false),
		businessHours: z.string().optional().nullable(),
	})
	.superRefine((data, ctx) => {
		if (data.useOwnBusinessHours && !data.businessHours?.trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message:
					"Business hours are required when custom facility hours are enabled.",
				path: ["businessHours"],
			});
		}
	});
export type CreateFacilitiesInput = z.infer<typeof createFacilitiesSchema>;

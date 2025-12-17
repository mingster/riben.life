import { z } from "zod";

export const updateLocaleSchema = z.object({
	id: z.string().max(5, "Locale ID must be 5 characters or less"),
	name: z.string().min(1, "Locale name is required"),
	lng: z.string().length(2, "Language code must be 2 characters"),
	defaultCurrencyId: z.string().min(1, "Default currency is required"),
});

export type UpdateLocaleInput = z.infer<typeof updateLocaleSchema>;

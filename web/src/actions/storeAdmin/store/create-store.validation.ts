import { z } from "zod";

export const createStoreSchema = z.object({
	name: z.string().min(1, "Store name is required"),
	defaultLocale: z.string().min(1, "Default locale is required"),
	defaultCountry: z.string().min(1, "Default country is required"),
	defaultCurrency: z.string().min(1, "Default currency is required"),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

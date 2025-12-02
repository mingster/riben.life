import { z } from "zod";

export const updateStoreBasicSchema = z.object({
	name: z.string().min(1, "Store name is required"),
	orderNoteToCustomer: z.string().optional().nullable(),
	defaultLocale: z.string().min(1),
	defaultCountry: z.string().min(1),
	defaultCurrency: z.string().min(1),
	autoAcceptOrder: z.boolean().optional().default(false),
	isOpen: z.boolean().optional().default(false),
	acceptAnonymousOrder: z.boolean().optional().default(true),
	useBusinessHours: z.boolean().optional().default(true),
	businessHours: z.string().optional().nullable().default(""),
	requireSeating: z.boolean().optional().default(false),
	requirePrepaid: z.boolean().optional().default(true),
});

export type UpdateStoreBasicInput = z.infer<typeof updateStoreBasicSchema>;

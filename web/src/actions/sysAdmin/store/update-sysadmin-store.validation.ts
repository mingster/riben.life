import { z } from "zod";

export const updateSysAdminStoreSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, "Name is required"),
	defaultCountry: z.string().min(1),
	defaultCurrency: z.string().min(1),
	defaultLocale: z.string().min(1),
	isOpen: z.boolean(),
	acceptAnonymousOrder: z.boolean(),
	autoAcceptOrder: z.boolean(),
});

export type UpdateSysAdminStoreInput = z.infer<
	typeof updateSysAdminStoreSchema
>;

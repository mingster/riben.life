import { z } from "zod";

export const createSysAdminStoreSchema = z.object({
	name: z.string().min(1, "Name is required"),
	organizationId: z.string().min(1, "Organization is required"),
	ownerId: z.string().min(1, "Owner user ID is required"),
	defaultCountry: z.string().min(1, "Country is required"),
	defaultCurrency: z.string().min(1, "Currency is required"),
	defaultLocale: z.string().min(1, "Locale is required"),
});

export type CreateSysAdminStoreInput = z.infer<
	typeof createSysAdminStoreSchema
>;

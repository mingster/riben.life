import { z } from "zod";

export const updateStoreAdminSettingsSchema = z.object({
	storeName: z.string().min(1, "Store name is required"),
	storefrontFreeShippingMinimum: z.number().nonnegative().nullable().optional(),
	storefrontShippingEtaCopy: z.string().nullable().optional(),
	storefrontPickupLocationsJson: z
		.string()
		.min(1)
		.refine(
			(s) => {
				try {
					const parsed = JSON.parse(s) as unknown;
					return Array.isArray(parsed);
				} catch {
					return false;
				}
			},
			{ message: "Must be a JSON array of pickup locations" },
		),
});

export type UpdateStoreAdminSettingsInput = z.infer<
	typeof updateStoreAdminSettingsSchema
>;

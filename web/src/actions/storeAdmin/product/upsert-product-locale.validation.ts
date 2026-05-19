import { z } from "zod";

export const upsertProductLocaleSchema = z.object({
	productId: z.string().min(1),
	localeId: z.string().min(1),
	name: z.string().min(1, "Name is required"),
});

export type UpsertProductLocaleInput = z.infer<
	typeof upsertProductLocaleSchema
>;

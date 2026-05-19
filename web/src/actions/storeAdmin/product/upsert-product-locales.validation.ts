import { z } from "zod";

export const upsertProductLocalesSchema = z.object({
	productId: z.string().min(1),
	locales: z.record(z.string(), z.string()),
});

export type UpsertProductLocalesInput = z.infer<
	typeof upsertProductLocalesSchema
>;

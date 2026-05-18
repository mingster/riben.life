import { z } from "zod";

export const updateStoreLocalesSchema = z.object({
	supportedLocales: z
		.array(z.string())
		.min(1, "At least one supported locale is required"),
});

export type UpdateStoreLocalesInput = z.infer<typeof updateStoreLocalesSchema>;

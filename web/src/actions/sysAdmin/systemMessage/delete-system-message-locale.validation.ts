import { z } from "zod";

export const deleteSystemMessageLocaleSchema = z.object({
	id: z.string().min(1),
});

export type DeleteSystemMessageLocaleInput = z.infer<
	typeof deleteSystemMessageLocaleSchema
>;

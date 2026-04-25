import { z } from "zod";

/** Patch only the fields you send; used after reservation when the customer edits contact info. */
export const updateUserContactSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	phone: z.string().min(1).optional(),
});

export type UpdateUserContactInput = z.infer<typeof updateUserContactSchema>;

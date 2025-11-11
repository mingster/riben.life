import { z } from "zod/v4";

export const updateStoreRsvpSchema = z.object({
	storeId: z.string().min(1),
	acceptReservation: z.boolean(),
});

export type UpdateStoreRsvpInput = z.infer<typeof updateStoreRsvpSchema>;

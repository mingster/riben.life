import { z } from "zod";

export const updateStoreRsvpSchema = z.object({
	storeId: z.string().min(1),
	acceptReservation: z.boolean(),
});

export type UpdateStoreRsvpInput = z.infer<typeof updateStoreRsvpSchema>;

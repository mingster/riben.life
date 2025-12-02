import { z } from "zod";

export const updateStoreRsvpSchema = z.object({
	acceptReservation: z.boolean(),
});

export type UpdateStoreRsvpInput = z.infer<typeof updateStoreRsvpSchema>;

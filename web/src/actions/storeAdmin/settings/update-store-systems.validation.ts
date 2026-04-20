import { z } from "zod";

export const updateStoreSystemsSchema = z.object({
	useOrderSystem: z.boolean(),
	acceptReservation: z.boolean(),
	waitlistEnabled: z.boolean(),
});

export type UpdateStoreSystemsInput = z.infer<typeof updateStoreSystemsSchema>;

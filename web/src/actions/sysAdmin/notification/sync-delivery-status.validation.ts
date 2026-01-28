import { z } from "zod";

export const syncDeliveryStatusSchema = z.object({
	notificationId: z.string().optional(),
	channel: z.string().optional(),
});

export type SyncDeliveryStatusInput = z.infer<typeof syncDeliveryStatusSchema>;

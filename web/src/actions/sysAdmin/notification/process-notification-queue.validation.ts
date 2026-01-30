import { z } from "zod";

export const processNotificationQueueSchema = z.object({
	batchSize: z.coerce.number().int().min(1).max(500).optional(),
});

export type ProcessNotificationQueueInput = z.infer<
	typeof processNotificationQueueSchema
>;

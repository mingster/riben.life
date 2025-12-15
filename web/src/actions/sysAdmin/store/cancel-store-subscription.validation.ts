import { z } from "zod";

export const cancelStoreSubscriptionSchema = z.object({
	storeId: z.string().min(1, { message: "Store ID is required" }),
	note: z.string().optional().nullable(),
});

export type CancelStoreSubscriptionInput = z.infer<
	typeof cancelStoreSubscriptionSchema
>;

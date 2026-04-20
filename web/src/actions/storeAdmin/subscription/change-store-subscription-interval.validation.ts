import { z } from "zod";

export const changeStoreSubscriptionIntervalSchema = z.object({
	targetInterval: z.enum(["month", "year"]),
});

export type ChangeStoreSubscriptionIntervalInput = z.infer<
	typeof changeStoreSubscriptionIntervalSchema
>;

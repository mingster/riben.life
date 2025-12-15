import { z } from "zod";
import { StoreLevel } from "@/types/enum";

export const updateStoreSubscriptionSchema = z.object({
	storeId: z.string().min(1, { message: "Store ID is required" }),
	level: z.nativeEnum(StoreLevel),
	subscriptionId: z.string().optional().nullable(),
	expiration: z.date().optional().nullable(),
	note: z.string().optional().nullable(),
});

export type UpdateStoreSubscriptionInput = z.infer<
	typeof updateStoreSubscriptionSchema
>;

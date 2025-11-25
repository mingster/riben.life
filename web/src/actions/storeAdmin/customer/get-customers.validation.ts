import { z } from "zod";

export const getCustomersSchema = z.object({
	storeId: z.string().min(1, "storeId is required"),
});

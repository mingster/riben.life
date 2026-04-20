import { z } from "zod";

export const restoreSysAdminStoreSchema = z.object({
	id: z.string().min(1),
});

export type RestoreSysAdminStoreInput = z.infer<
	typeof restoreSysAdminStoreSchema
>;

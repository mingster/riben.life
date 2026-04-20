import { z } from "zod";

export const softDeleteSysAdminStoreSchema = z.object({
	id: z.string().min(1),
});

export type SoftDeleteSysAdminStoreInput = z.infer<
	typeof softDeleteSysAdminStoreSchema
>;

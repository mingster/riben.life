import { z } from "zod";

export const deleteSysAdminOrganizationSchema = z.object({
	id: z.string().min(1),
});

export type DeleteSysAdminOrganizationInput = z.infer<
	typeof deleteSysAdminOrganizationSchema
>;

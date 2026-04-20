import { z } from "zod";

const slugSchema = z
	.string()
	.min(1, "Slug is required")
	.max(120)
	.regex(
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/,
		"Use lowercase letters, numbers, and single hyphens (no leading/trailing hyphen)",
	)
	.transform((s) => s.trim().toLowerCase());

export const createSysAdminOrganizationSchema = z.object({
	name: z.string().min(1, "Name is required").max(200),
	slug: slugSchema,
	logo: z.string().max(2000).optional().nullable(),
	metadata: z.string().max(50000).optional().nullable(),
});

export type CreateSysAdminOrganizationInput = z.infer<
	typeof createSysAdminOrganizationSchema
>;

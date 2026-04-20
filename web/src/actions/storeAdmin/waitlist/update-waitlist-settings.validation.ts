import { z } from "zod";

export const updateWaitlistSettingsSchema = z
	.object({
		enabled: z.boolean(),
		requireSignIn: z.boolean(),
		requireName: z.boolean(),
		requireLineOnly: z.boolean(),
		/** Minutes relative to nominal open; negative delays join until after open. */
		canGetNumBefore: z.number().int(),
	})
	.refine(
		(data) => {
			if (data.requireLineOnly) {
				return data.requireSignIn === true;
			}
			return true;
		},
		{
			message: "waitlist_require_sign_in_when_line_only",
			path: ["requireSignIn"],
		},
	);

export type UpdateWaitlistSettingsInput = z.infer<
	typeof updateWaitlistSettingsSchema
>;

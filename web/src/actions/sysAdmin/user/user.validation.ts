import { z } from "zod";

export const updateUserSettingsSchema = z
	.object({
		id: z.string().min(1, "User ID is required"),
		name: z.string().min(1, "Name is required"),
		email: z
			.union([z.string().email("Invalid email format"), z.literal("")])
			.optional(),
		password: z
			.union([
				z.string().min(8, "Password must be at least 8 characters"),
				z.literal(""),
			])
			.optional(),
		locale: z.string().min(1, "Locale is required"),
		timezone: z.string().min(1, "Timezone is required"),
		role: z.string().min(1, "Role is required"),
		stripeCustomerId: z.union([z.string(), z.literal(""), z.null()]).optional(),
		phoneNumber: z.string().optional().or(z.literal("")),
		phoneNumberVerified: z.boolean().optional(),
		image: z
			.union([z.string().url("Invalid URL format"), z.literal(""), z.null()])
			.optional(),
		twoFactorEnabled: z.boolean().optional(),
		banned: z.boolean().optional(),
		banReason: z.string().nullable().optional(),
		banExpires: z.string().optional(), // ISO date string
	})
	.refine(
		(data) => {
			// If banned is true, banReason must be provided (not null/undefined)
			if (data.banned === true) {
				return (
					data.banReason !== null &&
					data.banReason !== undefined &&
					data.banReason.trim() !== ""
				);
			}
			return true;
		},
		{
			message: "Ban reason is required when user is banned",
			path: ["banReason"],
		},
	)
	.refine(
		(data) => {
			// If phoneNumberVerified is true, phoneNumber must have a value
			if (data.phoneNumberVerified === true) {
				return (
					data.phoneNumber !== null &&
					data.phoneNumber !== undefined &&
					data.phoneNumber.trim() !== ""
				);
			}
			return true;
		},
		{
			message: "Phone number is required when phone number is verified",
			path: ["phoneNumber"],
		},
	);

export type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

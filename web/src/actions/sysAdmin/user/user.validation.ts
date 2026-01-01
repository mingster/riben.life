import { z } from "zod";

export const updateUserSettingsSchema = z
	.object({
		id: z.string(),
		name: z.string().min(5, {
			error: "name is required",
		}),
		email: z.email().optional(),
		password: z.string().optional(),
		locale: z.string().min(1, {
			error: "locale is required",
		}),
		timezone: z.string(),
		role: z.string(),
		stripeCustomerId: z.string().optional(),
		phoneNumber: z.string().optional(),
		phoneNumberVerified: z.boolean().optional(),
		image: z.string().url().optional().or(z.literal("")),
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

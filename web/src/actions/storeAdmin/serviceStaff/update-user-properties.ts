"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";

const updateUserPropertiesSchema = z.object({
	userId: z.string().min(1, "User ID is required"),
	name: z.string().min(1, "Name is required"),
	email: z
		.string()
		.optional()
		.refine(
			(val) => !val || val === "" || z.string().email().safeParse(val).success,
			{
				message: "Invalid email address",
			},
		),
	phone: z.string().optional(),
});

export const updateUserPropertiesAction = storeActionClient
	.metadata({ name: "updateUserProperties" })
	.schema(updateUserPropertiesSchema)
	.action(async ({ parsedInput }) => {
		const { userId, name, email, phone } = parsedInput;

		// Update user properties
		await sqlClient.user.update({
			where: { id: userId },
			data: {
				name: name.trim(),
				email: email && email.trim() !== "" ? email.trim() : null,
				phoneNumber: phone && phone.trim() !== "" ? phone.trim() : null,
			},
		});

		return { success: true };
	});

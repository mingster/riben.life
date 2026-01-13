import { z } from "zod";

export const deleteUserSchema = z.object({
	userEmail: z.string().email("Invalid email format"),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

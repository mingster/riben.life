"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { User } from "@/types";

const searchUsersSchema = z.object({
	query: z.string().min(1, "Search query is required"),
});

export const searchUsersAction = storeActionClient
	.metadata({ name: "searchUsers" })
	.schema(searchUsersSchema)
	.action(async ({ parsedInput }) => {
		const { query } = parsedInput;

		// Search users by name, email, or phone number
		const users = (await sqlClient.user.findMany({
			where: {
				OR: [
					{
						name: {
							contains: query,
							mode: "insensitive",
						},
					},
					{
						email: {
							contains: query,
							mode: "insensitive",
						},
					},
					{
						phoneNumber: {
							contains: query,
							mode: "insensitive",
						},
					},
				],
			},
			select: {
				id: true,
				name: true,
				email: true,
				phoneNumber: true,
			},
			orderBy: {
				name: "asc",
			},
			take: 50, // Limit results for performance
		})) as User[];

		transformPrismaDataForJson(users);

		return { users };
	});

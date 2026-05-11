import { sqlClient } from "@/lib/prismadb";

/**
 * Returns whether the user has linked LINE OAuth (Better Auth `Account` with `providerId === "line"`).
 */
export async function hasLineLinkedAccountForUser(
	userId: string,
): Promise<boolean> {
	const row = await sqlClient.account.findFirst({
		where: { userId, providerId: "line" },
		select: { id: true },
	});
	return Boolean(row);
}

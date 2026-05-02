"use server";

import { checkAdminAccess } from "@/app/sysAdmin/admin-utils";
import { auth } from "@/lib/auth";
import { removeUserDataAndAuth } from "@/actions/sysAdmin/user/remove-user-data";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { Role } from "@prisma/client";
import { headers } from "next/headers";

async function requireAdminSessionUserId(): Promise<string> {
	const allowed = await checkAdminAccess();
	if (!allowed) {
		throw new Error("Unauthorized");
	}
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const id = session?.user?.id;
	if (!id) {
		throw new Error("Unauthorized");
	}
	return id;
}

function customerUserWhere(
	currentUserId: string,
	ownerIds: ReadonlySet<string>,
) {
	const excludeIds = Array.from(new Set([currentUserId, ...ownerIds]));
	return {
		role: Role.user,
		id: { notIn: excludeIds },
	};
}

/**
 * Count platform users with {@link Role.user} eligible for bulk delete
 * (excludes the current session user and every store owner user).
 */
export async function getCustomerUserDeleteCount(): Promise<number> {
	const currentUserId = await requireAdminSessionUserId();
	const stores = await sqlClient.store.findMany({
		select: { ownerId: true },
	});
	const ownerIds = new Set(
		stores.map((s) => s.ownerId).filter((id): id is string => Boolean(id)),
	);
	return sqlClient.user.count({
		where: customerUserWhere(currentUserId, ownerIds),
	});
}

/**
 * Deletes all customer platform users (`User.role === user`), except:
 * - the current session user
 * - any user who is a `Store.ownerId` (deleting them would cascade-delete stores)
 *
 * Uses the same Prisma + Better Auth sequence as {@link removeUserDataAndAuth}; ticket threads
 * are cleared iteratively first so `supportTicket` deletes do not violate `TicketThread` FKs.
 */
export async function deleteAllCustomerUsers(): Promise<number> {
	const currentUserId = await requireAdminSessionUserId();
	const stores = await sqlClient.store.findMany({
		select: { ownerId: true },
	});
	const ownerIds = new Set(
		stores.map((s) => s.ownerId).filter((id): id is string => Boolean(id)),
	);

	const targetUsers = await sqlClient.user.findMany({
		where: customerUserWhere(currentUserId, ownerIds),
		select: { id: true, email: true },
	});
	if (targetUsers.length === 0) {
		return 0;
	}

	const targetIds = targetUsers.map((u) => u.id);

	let ticketRounds = 0;
	while (ticketRounds < 5000) {
		ticketRounds += 1;
		const { count } = await sqlClient.supportTicket.deleteMany({
			where: {
				Thread: { none: {} },
				OR: [
					{ senderId: { in: targetIds } },
					{ recipientId: { in: targetIds } },
				],
			},
		});
		if (count === 0) {
			break;
		}
	}
	if (ticketRounds >= 5000) {
		throw new Error(
			"Support ticket cleanup exceeded iteration limit; aborting.",
		);
	}

	let deleted = 0;
	for (const u of targetUsers) {
		await removeUserDataAndAuth({
			userId: u.id,
			userEmail: u.email ?? "",
		});
		deleted += 1;
	}

	logger.info("Deleted customer users (role=user)", {
		metadata: { deleted, targetCount: targetUsers.length },
		tags: ["action", "maint"],
	});

	return deleted;
}

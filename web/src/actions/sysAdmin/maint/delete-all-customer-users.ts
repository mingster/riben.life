"use server";

import { checkAdminAccess } from "@/app/sysAdmin/admin-utils";
import { auth } from "@/lib/auth";
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
 * - any user who is a `Store.ownerId`
 *
 * Uses bulk `deleteMany` across related tables rather than per-user iteration.
 * Relations with `onDelete: Cascade` are handled automatically by Postgres on user delete.
 * Only models without cascade (MessageQueue, SupportTicket, Subscription, Invitation, StoreOrder)
 * are explicitly cleaned up first.
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
	const targetEmails = targetUsers
		.map((u) => u.email)
		.filter((e): e is string => Boolean(e));

	// SupportTicket has a self-referential thread FK (onDelete: Restrict) — delete leaves first
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
		if (count === 0) break;
	}

	// MessageQueue senderId/recipientId are required fields with no onDelete cascade
	await sqlClient.messageQueue.deleteMany({
		where: {
			OR: [{ senderId: { in: targetIds } }, { recipientId: { in: targetIds } }],
		},
	});

	// Subscription uses referenceId, not a direct user FK
	await sqlClient.subscription.deleteMany({
		where: { referenceId: { in: targetIds } },
	});

	// Invitation is keyed by email, not userId
	if (targetEmails.length > 0) {
		await sqlClient.invitation.deleteMany({
			where: { email: { in: targetEmails } },
		});
	}

	// StoreOrder.userId is nullable with no onDelete; explicitly delete to avoid orphans
	await sqlClient.storeOrder.deleteMany({
		where: { userId: { in: targetIds } },
	});

	// Delete users — all remaining FK relations have onDelete: Cascade
	const { count: deleted } = await sqlClient.user.deleteMany({
		where: { id: { in: targetIds } },
	});

	logger.info("Deleted customer users (role=user)", {
		metadata: { deleted, targetCount: targetUsers.length },
		tags: ["action", "maint"],
	});

	return deleted;
}

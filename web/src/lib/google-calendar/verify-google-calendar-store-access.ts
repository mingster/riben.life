import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Ensures the session user may manage Google Calendar for this store (owner, storeAdmin, staff, or sys admin).
 * The OAuth connection is always stored for `session.user.id` (the connecting user).
 */
export async function verifyGoogleCalendarStoreAccess(
	storeId: string,
): Promise<{ userId: string } | NextResponse> {
	if (!storeId || storeId.trim() === "") {
		return new NextResponse("Store id required", { status: 400 });
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const userId = session?.user?.id;
	if (typeof userId !== "string" || userId.length === 0) {
		return new NextResponse("Unauthenticated", { status: 401 });
	}

	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: { id: true, organizationId: true },
	});
	if (!store) {
		return new NextResponse("Store not found", { status: 404 });
	}

	const role = session?.user?.role;
	if (role === Role.admin || role === "admin") {
		return { userId };
	}

	const member = await sqlClient.member.findFirst({
		where: {
			userId,
			organizationId: store.organizationId,
			role: { in: [Role.owner, Role.storeAdmin, Role.staff] },
		},
		select: { id: true },
	});

	if (!member) {
		logger.warn("Google Calendar OAuth denied: not a store member", {
			metadata: { storeId, userId },
			tags: ["google-calendar", "auth"],
		});
		return new NextResponse("Forbidden", { status: 403 });
	}

	return { userId };
}

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

// Called by StoreSwitcher to obtain user's store(s) (owned or org staff/storeAdmin/owner).
//
export async function GET(
	_req: Request,
	props: { params: Promise<{ ownerId: string }> },
) {
	const params = await props.params;
	if (!params.ownerId) {
		return new NextResponse("User is required", { status: 401 });
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const sessionUserId = session?.user?.id;
	if (!sessionUserId || sessionUserId !== params.ownerId) {
		return new NextResponse("Forbidden", { status: 403 });
	}

	const memberships = await sqlClient.member.findMany({
		where: {
			userId: sessionUserId,
			role: { in: [Role.owner, Role.storeAdmin, Role.staff] },
		},
		select: { organizationId: true },
	});
	const orgIds = [...new Set(memberships.map((m) => m.organizationId))];

	const orConditions: Array<
		{ ownerId: string } | { organizationId: { in: string[] } }
	> = [{ ownerId: sessionUserId }];
	if (orgIds.length > 0) {
		orConditions.push({ organizationId: { in: orgIds } });
	}

	const stores = await sqlClient.store.findMany({
		where: {
			isDeleted: false,
			OR: orConditions,
		},
		select: {
			id: true,
			name: true,
			ownerId: true,
			organizationId: true,
			defaultLocale: true,
			defaultCountry: true,
			defaultCurrency: true,
			level: true,
			isDeleted: true,
			createdAt: true,
			updatedAt: true,
		},
	});

	transformPrismaDataForJson(stores);

	//console.log('stores: ' + JSON.stringify(stores));

	return NextResponse.json(stores);
}

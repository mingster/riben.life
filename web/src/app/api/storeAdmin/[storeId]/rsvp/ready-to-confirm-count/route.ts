import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "@/app/api/storeAdmin/api_helper";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof Response) {
		return access;
	}

	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const currentUserId = session?.user?.id;
	const userRole = session?.user?.role;
	const isStaff = userRole === Role.staff;
	const staffFilter =
		isStaff && currentUserId ? { createdBy: currentUserId } : undefined;

	const count = await sqlClient.rsvp.count({
		where: {
			storeId: params.storeId,
			...(staffFilter ?? {}),
			status: RsvpStatus.ReadyToConfirm,
		},
	});

	return NextResponse.json({ count });
}

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../api_helper";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { User } from "@/types";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const store = await sqlClient.store.findUnique({
			where: {
				id: params.storeId,
			},
			select: {
				organizationId: true,
			},
		});

		if (!store) {
			return new NextResponse("Store not found", { status: 404 });
		}

		if (!store.organizationId) {
			return NextResponse.json([]);
		}

		// Get all member users in the organization
		const members = await sqlClient.member.findMany({
			where: {
				organizationId: store.organizationId,
			},
		});

		if (members.length === 0) {
			return NextResponse.json([]);
		}

		const users = (await sqlClient.user.findMany({
			where: {
				id: {
					in: members.map((member) => member.userId),
				},
			},
			include: {
				sessions: true,
			},
		})) as User[];

		transformPrismaDataForJson(users);

		return NextResponse.json(users);
	} catch (error) {
		logger.error("Failed to get store customers", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				storeId: params.storeId,
			},
			tags: ["api", "customers", "error"],
		});

		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}

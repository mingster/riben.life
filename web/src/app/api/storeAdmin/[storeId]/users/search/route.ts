import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

interface UserSearchRow {
	id: string;
	name: string | null;
	email: string | null;
	phoneNumber: string | null;
}

const MAX_RESULTS = 30;
const MIN_QUERY_LEN = 2;

/**
 * GET /api/storeAdmin/[storeId]/users/search?q=...
 * Returns users matching id, name, email, or phone (partial, case-insensitive).
 */
export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const gate = await CheckStoreAdminApiAccess(params.storeId);
	if (gate instanceof NextResponse) {
		return gate;
	}

	const { searchParams } = new URL(req.url);
	const rawQ = (searchParams.get("q") ?? "").trim();
	if (rawQ.length < MIN_QUERY_LEN) {
		return NextResponse.json({ users: [] as UserSearchRow[] });
	}

	try {
		const users = await sqlClient.user.findMany({
			where: {
				OR: [
					{ id: { contains: rawQ, mode: "insensitive" } },
					{ email: { contains: rawQ, mode: "insensitive" } },
					{ name: { contains: rawQ, mode: "insensitive" } },
					{ phoneNumber: { contains: rawQ, mode: "insensitive" } },
				],
			},
			select: {
				id: true,
				name: true,
				email: true,
				phoneNumber: true,
			},
			take: MAX_RESULTS,
			orderBy: { name: "asc" },
		});

		transformPrismaDataForJson(users);
		return NextResponse.json({ users });
	} catch (err: unknown) {
		logger.error("storeAdmin users search failed", {
			metadata: {
				storeId: params.storeId,
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "storeAdmin", "error"],
		});
		return new NextResponse("Internal error", { status: 500 });
	}
}

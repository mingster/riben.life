import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const list = await sqlClient.address.findMany({
		where: { userId: session.user.id },
		include: { Country: { select: { name: true, alpha3: true } } },
		orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
	});

	transformPrismaDataForJson(list);
	return NextResponse.json(list);
}

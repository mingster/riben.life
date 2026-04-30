import { sqlClient } from "@/lib/prismadb";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Dev-only: returns a user's current credit balance.
 * GET /api/e2e/credit-balance?userId=X
 */
export async function GET(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const userId = req.nextUrl.searchParams.get("userId");
	if (!userId) {
		return NextResponse.json({ error: "userId required" }, { status: 400 });
	}

	const credit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});

	return NextResponse.json({ point: Number(credit?.point ?? 0) });
}

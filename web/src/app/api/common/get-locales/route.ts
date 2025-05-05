import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

// returns all locales currently in db
export async function GET(_req: Request) {
	try {
		const locales = await sqlClient.locale.findMany({ orderBy: { id: "asc" } });

		return NextResponse.json(locales);
	} catch (error) {
		console.log("[GET_LOCALES]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}

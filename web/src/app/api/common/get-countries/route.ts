import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";

// returns all countries currently in db
export async function GET(_req: Request) {
	try {
		const countries = await sqlClient.country.findMany({
			orderBy: { alpha3: "asc" },
		});

		return NextResponse.json(countries);
	} catch (error) {
		console.error("[GET_COUNTRIES]", error);

		return new NextResponse("Internal error", { status: 500 });
	}
}

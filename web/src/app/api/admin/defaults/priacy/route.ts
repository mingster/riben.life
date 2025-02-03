import fs from "node:fs";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckAdminApiAccess } from "../../api_helper";

///!SECTION update default privacy md file in /public/defaults/privacy.md
export async function POST(req: Request) {
	CheckAdminApiAccess();

	const body = await req.json();
	const { privacyPolicy } = body;

	await fs.writeFileSync(
		`${process.cwd()}/public/defaults/privacy.md`,
		privacyPolicy,
	);

	//console.log(privacyPolicy);

	return NextResponse.json("ok");
}

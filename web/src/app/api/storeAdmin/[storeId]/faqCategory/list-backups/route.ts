import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	CheckStoreAdminApiAccess(params.storeId);

	try {
		const backupDir = path.join(process.cwd(), "public", "backup");
		const files = await fs.readdir(backupDir);
		const jsonFiles = files
			.filter((f) => f.startsWith("faq-backup-") && f.endsWith(".json"))
			.sort()
			.reverse();
		return NextResponse.json({ files: jsonFiles });
	} catch {
		return NextResponse.json({ files: [] });
	}
}

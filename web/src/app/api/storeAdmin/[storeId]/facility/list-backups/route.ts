import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { CheckStoreAdminApiAccess } from "../../../api_helper";

export async function GET(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const backupDir = path.join(process.cwd(), "public", "backup");
		const files = await fs.readdir(backupDir);
		// Filter for facility backup files for this store
		const facilityFiles = files.filter(
			(f) =>
				f.endsWith(".json") &&
				f.startsWith(`facility-backup-${params.storeId}-`),
		);
		return NextResponse.json({ files: facilityFiles });
	} catch (error: unknown) {
		return NextResponse.json(
			{
				files: [],
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

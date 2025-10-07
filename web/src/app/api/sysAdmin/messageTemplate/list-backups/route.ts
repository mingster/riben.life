import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
	try {
		const backupDir = path.join(process.cwd(), "public", "backup");
		const files = await fs.readdir(backupDir);
		const jsonFiles = files.filter((f) => f.endsWith(".json"));
		return NextResponse.json({ files: jsonFiles });
	} catch (error: any) {
		return NextResponse.json(
			{ files: [], error: error?.message || "Unknown error" },
			{ status: 500 },
		);
	}
}

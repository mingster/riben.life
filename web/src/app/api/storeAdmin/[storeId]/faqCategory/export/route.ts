import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { promises as fs } from "fs";
import path from "path";
import {
	assertStoreImportExportAccess,
	CheckStoreAdminApiAccess,
} from "../../../api_helper";

export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const access = await CheckStoreAdminApiAccess(params.storeId);
	if (access instanceof NextResponse) {
		return access;
	}

	const importExportDenied = await assertStoreImportExportAccess(
		params.storeId,
	);
	if (importExportDenied) {
		return importExportDenied;
	}

	try {
		const categories = await sqlClient.faqCategory.findMany({
			where: { storeId: params.storeId },
			include: {
				locales: true,
				FAQ: {
					include: { locales: true },
					orderBy: { sortOrder: "asc" },
				},
			},
			orderBy: { sortOrder: "asc" },
		});

		const backupDir = path.join(process.cwd(), "public", "backup");
		await fs.mkdir(backupDir, { recursive: true });

		const now = new Date();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fileName = `faq-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
		const filePath = path.join(backupDir, fileName);

		const serializable = JSON.parse(
			JSON.stringify(categories, (_key, value) =>
				typeof value === "bigint" ? value.toString() : value,
			),
		);

		await fs.writeFile(filePath, JSON.stringify(serializable, null, 2), "utf8");

		return NextResponse.json({ success: true, fileName });
	} catch (error) {
		logger.error("faq export failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["faq", "export", "error"],
		});
		return NextResponse.json(
			{ success: false, error: (error as Error).message ?? "Unknown error" },
			{ status: 500 },
		);
	}
}

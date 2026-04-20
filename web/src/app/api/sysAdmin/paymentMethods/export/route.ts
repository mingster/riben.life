import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { CheckAdminApiAccess } from "../../api_helper";

export async function POST() {
	const accessCheck = await CheckAdminApiAccess();
	if (accessCheck) {
		return accessCheck;
	}

	try {
		const methods = await sqlClient.paymentMethod.findMany({
			orderBy: { name: "asc" },
		});

		transformPrismaDataForJson(methods);

		const now = getUtcNow();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fileName = `payment-methods-backup-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.json`;

		const jsonContent = JSON.stringify(methods, null, 2);

		return new NextResponse(jsonContent, {
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Content-Disposition": `attachment; filename="${fileName}"`,
			},
		});
	} catch (err: unknown) {
		logger.error("payment methods export failed", {
			metadata: {
				error: err instanceof Error ? err.message : String(err),
			},
			tags: ["api", "sysAdmin", "export", "error"],
		});
		return NextResponse.json(
			{
				success: false,
				error: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

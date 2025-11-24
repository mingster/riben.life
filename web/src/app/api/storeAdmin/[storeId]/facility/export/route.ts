import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNow } from "@/utils/datetime-utils";
import { transformDecimalsToNumbers } from "@/utils/utils";

export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;

	try {
		CheckStoreAdminApiAccess(params.storeId);

		// Fetch all facilities for this store
		const facilities = await sqlClient.storeFacility.findMany({
			where: {
				storeId: params.storeId,
			},
		});

		// Prepare file name using UTC methods since getUtcNow() returns UTC Date
		const now = getUtcNow();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fileName = `facility-backup-${params.storeId}-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.json`;

		// Convert Decimal to number for JSON serialization
		transformDecimalsToNumbers(facilities);

		// Convert to JSON string
		const jsonContent = JSON.stringify(facilities, null, 2);

		// Return file as download
		return new NextResponse(jsonContent, {
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="${fileName}"`,
			},
		});
	} catch (error: unknown) {
		logger.error("facility export", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error"],
		});
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

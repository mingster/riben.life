import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNow } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function POST(
	_req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;

	try {
		CheckStoreAdminApiAccess(params.storeId);

		// Fetch all service staff for this store (exclude deleted ones) with user information
		const serviceStaff = await sqlClient.serviceStaff.findMany({
			where: {
				storeId: params.storeId,
				isDeleted: false,
			},
			include: {
				User: {
					select: {
						id: true,
						name: true,
						email: true,
						phoneNumber: true,
						locale: true,
						timezone: true,
						role: true,
					},
				},
			},
		});

		// Prepare file name using UTC methods since getUtcNow() returns UTC Date
		const now = getUtcNow();
		const pad = (n: number) => n.toString().padStart(2, "0");
		const fileName = `service-staff-backup-${params.storeId}-${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}.json`;

		// Convert BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
		transformPrismaDataForJson(serviceStaff);

		// Convert to JSON string
		const jsonContent = JSON.stringify(serviceStaff, null, 2);

		// Return file as download
		return new NextResponse(jsonContent, {
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename="${fileName}"`,
			},
		});
	} catch (error: unknown) {
		logger.error("service-staff export", {
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

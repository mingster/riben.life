import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformPrismaDataForJson } from "@/utils/utils";

export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	// Get userId from query parameter (extract outside try block for error handling)
	const { searchParams } = new URL(req.url);
	const userId = searchParams.get("userId");

	try {
		CheckStoreAdminApiAccess(params.storeId);

		if (!userId) {
			return new NextResponse("userId query parameter is required", {
				status: 400,
			});
		}

		const customerCredit = await sqlClient.customerCredit.findUnique({
			where: {
				userId: userId,
			},
		});

		if (!customerCredit) {
			// Return default credit of 0 if no record exists
			return NextResponse.json({ point: 0 });
		}

		transformPrismaDataForJson(customerCredit);

		return NextResponse.json({
			point: Number(customerCredit.point),
		});
	} catch (error) {
		logger.error("Failed to get customer credit", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				storeId: params.storeId,
				userId: searchParams.get("userId") || "unknown",
			},
			tags: ["api", "customers", "credit", "error"],
		});

		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}

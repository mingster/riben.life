import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

/**
 * Get organization by ID
 * GET /api/common/get-organization?id=org-id
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const id = searchParams.get("id");

		if (!id || id.trim().length === 0) {
			return NextResponse.json(
				{ error: "Organization ID parameter is required" },
				{ status: 400 },
			);
		}

		// Get organization by ID
		const organization = await sqlClient.organization.findUnique({
			where: {
				id: id.trim(),
			},
			select: {
				id: true,
				name: true,
				slug: true,
			},
		});

		if (!organization) {
			return NextResponse.json(
				{ error: "Organization not found" },
				{ status: 404 },
			);
		}

		transformPrismaDataForJson(organization);
		return NextResponse.json(organization);
	} catch (error) {
		logger.error("Failed to get organization", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "organization", "error"],
		});

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";

/**
 * Check if an organization slug is already taken
 * GET /api/common/check-organization-slug?slug=my-org
 */
export async function GET(req: Request) {
	try {
		const { searchParams } = new URL(req.url);
		const slug = searchParams.get("slug");

		if (!slug || slug.trim().length === 0) {
			return NextResponse.json(
				{ error: "Slug parameter is required" },
				{ status: 400 },
			);
		}

		// Check if organization with this slug exists
		const organization = await sqlClient.organization.findUnique({
			where: {
				slug: slug.trim(),
			},
			select: {
				id: true,
			},
		});

		// Return true if slug exists (is taken), false if available
		return NextResponse.json({
			status: organization !== null,
		});
	} catch (error) {
		logger.error("Failed to check organization slug", {
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

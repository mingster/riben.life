import { sqlClient } from "@/lib/prismadb";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Dev-only endpoint used by Playwright E2E tests.
 * Deletes a test Organization by ID — cascades to Store, RsvpSettings, StoreFacility, Rsvp, etc.
 *
 * Body: { orgId: string }
 */
export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const { orgId } = (await req.json()) as { orgId: string };
	if (!orgId) {
		return NextResponse.json({ error: "orgId required" }, { status: 400 });
	}

	try {
		await sqlClient.organization.delete({ where: { id: orgId } });
	} catch {
		// Already cleaned up — not an error
	}

	return NextResponse.json({ ok: true });
}

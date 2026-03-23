import { NextResponse } from "next/server";

/**
 * Legacy callback route kept for backward compatibility.
 * Forwards to the static callback URI used by Google OAuth policy compliance.
 */
export async function GET(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const url = new URL(req.url);
	await props.params;
	const query = url.search;
	return NextResponse.redirect(
		new URL(`/api/auth/google-calendar${query}`, url.origin),
	);
}

import { processRsvpCreditPointsRefund } from "@/actions/store/reservation/process-rsvp-refund-credit-point";
import { sqlClient } from "@/lib/prismadb";
import { type NextRequest, NextResponse } from "next/server";

interface RsvpCreditRefundRequest {
	storeId: string;
	userId: string;
	rsvpId: string;
}

/**
 * Dev-only: cancels a test RSVP and runs the credit point refund.
 * Used by Phase 3 E2E tests to verify the refund-on-cancel path.
 *
 * POST /api/e2e/rsvp-credit-refund
 */
export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await req.json()) as RsvpCreditRefundRequest;
	const { storeId, userId, rsvpId } = body;

	if (!storeId || !userId || !rsvpId) {
		return NextResponse.json(
			{ error: "storeId, userId, and rsvpId are required" },
			{ status: 400 },
		);
	}

	const rsvp = await sqlClient.rsvp.findUnique({
		where: { id: rsvpId },
		select: { orderId: true, customerId: true },
	});
	if (!rsvp)
		return NextResponse.json({ error: "RSVP not found" }, { status: 404 });

	const beforeCredit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});
	const balanceBefore = Number(beforeCredit?.point ?? 0);

	const result = await processRsvpCreditPointsRefund({
		rsvpId,
		storeId,
		customerId: rsvp.customerId ?? userId,
		orderId: rsvp.orderId ?? null,
	});

	const afterCredit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});
	const balanceAfter = Number(afterCredit?.point ?? 0);

	return NextResponse.json({
		refunded: result.refunded,
		refundAmount: result.refundAmount ?? 0,
		balanceBefore,
		balanceAfter,
	});
}

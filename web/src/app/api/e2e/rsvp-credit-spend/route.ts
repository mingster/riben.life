import { deduceCustomerCredit } from "@/actions/storeAdmin/rsvp/deduce-customer-credit";
import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

interface RsvpCreditSpendRequest {
	storeId: string;
	facilityId: string;
	userId: string;
	/** Credit points to seed into the user's balance before deduction. */
	creditToSeed: number;
	/** RSVP duration in minutes (e.g. 60). */
	duration: number;
	/** Minutes of service per credit point (e.g. 60 → 1 point per hour). */
	creditServiceExchangeRate: number;
	/** Cash value per credit point in store currency (e.g. 1 → 1 TWD per point). */
	creditExchangeRate: number;
}

/**
 * Dev-only: seeds a user's credit balance, creates a test RSVP, and runs credit
 * deduction. Used by Phase 3 E2E tests to verify the deduction path end-to-end.
 *
 * POST /api/e2e/rsvp-credit-spend
 */
export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await req.json()) as RsvpCreditSpendRequest;
	const {
		storeId,
		facilityId,
		userId,
		creditToSeed,
		duration,
		creditServiceExchangeRate,
		creditExchangeRate,
	} = body;

	if (!storeId || !facilityId || !userId || creditToSeed < 0 || duration <= 0) {
		return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: { id: true, defaultCurrency: true },
	});
	if (!store)
		return NextResponse.json({ error: "Store not found" }, { status: 404 });

	// deduceCustomerCredit requires a payment method with payUrl="creditPoint".
	// Upsert on name (@unique) — safe under concurrent test workers.
	await sqlClient.paymentMethod.upsert({
		where: { name: "E2E Credit Points" },
		update: {},
		create: {
			name: "E2E Credit Points",
			payUrl: "creditPoint",
			isDefault: false,
			isDeleted: false,
			createdAt: getUtcNowEpoch(),
			updatedAt: getUtcNowEpoch(),
		},
	});

	// Set credit balance to exactly creditToSeed (absolute, not increment) so the test
	// is deterministic regardless of any balance left over from previous test runs.
	await sqlClient.customerCredit.upsert({
		where: { userId },
		update: {
			point: new Prisma.Decimal(creditToSeed),
			updatedAt: getUtcNowEpoch(),
		},
		create: {
			userId,
			point: new Prisma.Decimal(creditToSeed),
			updatedAt: getUtcNowEpoch(),
		},
	});

	const beforeCredit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});
	const balanceBefore = Number(beforeCredit?.point ?? 0);

	// Create a minimal RSVP (7 days from now, 1-hour block)
	const now = getUtcNowEpoch();
	const rsvpTime = now + BigInt(7 * 24 * 60 * 60 * 1000);
	const rsvp = await sqlClient.rsvp.create({
		data: {
			storeId,
			facilityId,
			customerId: userId,
			rsvpTime,
			status: RsvpStatus.Ready,
			numOfAdult: 1,
			createdAt: now,
			updatedAt: now,
		},
	});

	// Deduct credit within a transaction
	const result = await sqlClient.$transaction(async (tx) => {
		return deduceCustomerCredit({
			tx,
			storeId,
			customerId: userId,
			rsvpId: rsvp.id,
			facilityId,
			duration,
			creditServiceExchangeRate,
			creditExchangeRate,
			defaultCurrency: store.defaultCurrency,
		});
	});

	const updatedRsvp = await sqlClient.rsvp.findUnique({
		where: { id: rsvp.id },
		select: { orderId: true },
	});

	const afterCredit = await sqlClient.customerCredit.findUnique({
		where: { userId },
		select: { point: true },
	});
	const balanceAfter = Number(afterCredit?.point ?? 0);

	return NextResponse.json({
		rsvpId: rsvp.id,
		orderId: updatedRsvp?.orderId ?? null,
		creditDeducted: result.creditDeducted,
		balanceBefore,
		balanceAfter,
		success: result.success,
		insufficientBalance: result.insufficientBalance,
	});
}

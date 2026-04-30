import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { type NextRequest, NextResponse } from "next/server";

const nowBigInt = () => BigInt(Date.now());

interface CreditRsvpStoreSetupRequest {
	ownerId: string;
	/** Credit points to seed into the owner's balance (default: 2000). */
	creditToSeed?: number;
	/** Per-session facility cost in store currency (default: 500). */
	facilityCost?: number;
}

export interface CreditRsvpTestStore {
	storeId: string;
	facilityId: string;
	orgId: string;
}

/**
 * Dev-only: creates a test store configured for prepaid credit RSVP testing.
 *
 * Differences from /api/e2e/setup:
 *  - Store has useCustomerCredit=true, creditExchangeRate=1, creditServiceExchangeRate=60
 *  - RsvpSettings has minPrepaidPercentage=100 (full upfront payment required)
 *  - Facility has defaultCost=facilityCost (default 500)
 *  - Seeds the owner's CustomerCredit with creditToSeed points (default 2000)
 *
 * POST /api/e2e/credit-rsvp-store-setup
 */
export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const body = (await req.json()) as CreditRsvpStoreSetupRequest;
	const { ownerId, creditToSeed = 2000, facilityCost = 500 } = body;

	if (!ownerId) {
		return NextResponse.json({ error: "ownerId required" }, { status: 400 });
	}

	const ts = Date.now();
	const orgId = `e2e-credit-org-${ts}`;

	await sqlClient.organization.create({
		data: {
			id: orgId,
			name: `E2E Credit Org ${ts}`,
			slug: orgId,
			createdAt: new Date(),
		},
	});

	await sqlClient.member.create({
		data: {
			id: `e2e-credit-mem-${ts}`,
			userId: ownerId,
			organizationId: orgId,
			role: "owner",
			createdAt: new Date(),
		},
	});

	const store = await sqlClient.store.create({
		data: {
			organizationId: orgId,
			name: `e2e-credit-store-${ts}`,
			ownerId,
			useCustomerCredit: true,
			creditExchangeRate: new Prisma.Decimal(1),
			creditServiceExchangeRate: new Prisma.Decimal(60), // 60 min = 1 point
			createdAt: nowBigInt(),
			updatedAt: nowBigInt(),
		},
	});

	await sqlClient.rsvpSettings.create({
		data: {
			storeId: store.id,
			acceptReservation: true,
			canReserveBefore: 30,
			canReserveAfter: 8760,
			canCancel: true,
			cancelHours: 24,
			defaultDuration: 60,
			minPrepaidPercentage: 100,
			createdAt: nowBigInt(),
			updatedAt: nowBigInt(),
		},
	});

	await sqlClient.storeSettings.create({
		data: { storeId: store.id, createdAt: nowBigInt(), updatedAt: nowBigInt() },
	});

	const facility = await sqlClient.storeFacility.create({
		data: {
			storeId: store.id,
			facilityName: `E2E Credit Facility ${ts}`,
			capacity: 10,
			defaultCost: facilityCost,
			defaultCredit: 0,
			defaultDuration: 60,
			useOwnBusinessHours: false,
			businessHours: null,
		},
	});

	// Seed customer credit for the owner (acting as customer in tests)
	await sqlClient.customerCredit.upsert({
		where: { userId: ownerId },
		update: {
			point: { increment: new Prisma.Decimal(creditToSeed) },
			updatedAt: nowBigInt(),
		},
		create: {
			userId: ownerId,
			point: new Prisma.Decimal(creditToSeed),
			updatedAt: nowBigInt(),
		},
	});

	return NextResponse.json({
		storeId: store.id,
		facilityId: facility.id,
		orgId,
	} satisfies CreditRsvpTestStore);
}

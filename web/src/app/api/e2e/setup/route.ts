import { sqlClient } from "@/lib/prismadb";
import { type NextRequest, NextResponse } from "next/server";

const nowBigInt = () => BigInt(Date.now());

/**
 * Dev-only endpoint used by Playwright E2E tests.
 * Creates a test Organization → Store → RsvpSettings → StoreFacility in one call.
 *
 * Body: { ownerId: string }
 * Returns: { storeId, facilityId, orgId, storeName, facilityName }
 */
export async function POST(req: NextRequest) {
	if (process.env.NODE_ENV === "production") {
		return NextResponse.json({ error: "Not found" }, { status: 404 });
	}

	const { ownerId } = (await req.json()) as { ownerId: string };
	if (!ownerId) {
		return NextResponse.json({ error: "ownerId required" }, { status: 400 });
	}

	const ts = Date.now();
	const orgId = `e2e-org-${ts}`;
	const storeName = `e2e-store-${ts}`;
	const facilityName = `E2E Facility ${ts}`;

	await sqlClient.organization.create({
		data: {
			id: orgId,
			name: `E2E Org ${ts}`,
			slug: orgId,
			createdAt: new Date(),
		},
	});

	await sqlClient.member.create({
		data: {
			id: `e2e-mem-${ts}`,
			userId: ownerId,
			organizationId: orgId,
			role: "owner",
			createdAt: new Date(),
		},
	});

	const store = await sqlClient.store.create({
		data: {
			organizationId: orgId,
			name: storeName,
			ownerId,
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
			minPrepaidPercentage: 0,
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
			facilityName,
			capacity: 10,
			defaultCost: 0,
			defaultCredit: 0,
			defaultDuration: 60,
			businessHours: null,
		},
	});

	return NextResponse.json({
		storeId: store.id,
		facilityId: facility.id,
		orgId,
		storeName,
		facilityName,
	});
}

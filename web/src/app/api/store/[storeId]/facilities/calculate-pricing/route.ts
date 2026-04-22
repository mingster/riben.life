import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { calculateRsvpPrice } from "@/utils/pricing/calculate-rsvp-price";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = Promise<{ storeId: string }>;

const bodySchema = z.object({
	facilityId: z.string().nullable().optional(),
	serviceStaffId: z.string().nullable().optional(),
	rsvpTime: z.string().min(1),
});

/**
 * Public pricing preview for customer reservation flows (`/s/.../reservation`).
 * Applies facility pricing rules (day/time in store timezone) and staff cross-discount rules.
 */
export async function POST(req: Request, props: { params: Params }) {
	const params = await props.params;
	const log = logger.child({
		module: "store-facilities-calculate-pricing",
		storeId: params.storeId,
	});

	try {
		const store = await sqlClient.store.findFirst({
			where: { id: params.storeId, isDeleted: false },
			select: { id: true },
		});
		if (!store) {
			return NextResponse.json({ error: "Store not found" }, { status: 404 });
		}

		const json = (await req.json()) as unknown;
		const parsed = bodySchema.safeParse(json);
		if (!parsed.success) {
			return NextResponse.json(
				{ error: "Invalid body", issues: parsed.error.flatten() },
				{ status: 400 },
			);
		}

		const { facilityId, serviceStaffId, rsvpTime } = parsed.data;
		const rsvpDate = new Date(rsvpTime);
		if (Number.isNaN(rsvpDate.getTime())) {
			return NextResponse.json({ error: "Invalid rsvpTime" }, { status: 400 });
		}

		const details = await calculateRsvpPrice({
			storeId: params.storeId,
			facilityId: facilityId?.trim() ? facilityId : null,
			serviceStaffId: serviceStaffId?.trim() ? serviceStaffId : null,
			rsvpTime: rsvpDate,
		});

		return NextResponse.json({
			totalCost: details.totalCost,
			totalCredit: details.totalCredit,
			details,
		});
	} catch (error) {
		log.error("calculate pricing failed", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["api", "error", "reservation"],
		});
		return NextResponse.json({ error: "Internal error" }, { status: 500 });
	}
}

import logger from "@/lib/logger";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { calculateRsvpPrice } from "@/utils/pricing/calculate-rsvp-price";

interface PricingRequest {
	facilityId?: string | null;
	serviceStaffId?: string | null;
	rsvpTime: string;
}

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();

		// Support both single object (backward compatibility) and array (batch)
		// Clean up input to match PricingRequest interface
		const rawRequests = Array.isArray(body) ? body : [body];

		const requests: PricingRequest[] = rawRequests.map((r: any) => ({
			facilityId: r.facilityId || null,
			serviceStaffId: r.serviceStaffId || null,
			rsvpTime: r.rsvpTime,
		}));

		if (requests.length === 0) {
			return NextResponse.json({
				cost: null,
				credit: null,
				pricingRuleId: null,
				totalCost: 0,
			});
		}

		// Process requests using shared logic
		const results = await Promise.all(
			requests.map(async (request) => {
				const rsvpTime = new Date(request.rsvpTime);
				if (isNaN(rsvpTime.getTime())) {
					return {
						cost: null,
						credit: null,
						pricingRuleId: null,
						totalCost: 0,
					};
				}

				const pricingResult = await calculateRsvpPrice({
					storeId: params.storeId,
					facilityId: request.facilityId,
					serviceStaffId: request.serviceStaffId,
					rsvpTime,
				});

				// Map back to expected API response format + new details
				return {
					cost: pricingResult.facility.discountedCost, // Legacy field
					credit: pricingResult.totalCredit || 0, // Simplified credit return
					pricingRuleId:
						pricingResult.facility.appliedRuleId ||
						pricingResult.crossDiscount.appliedRuleId,

					// New fields
					totalCost: pricingResult.totalCost,
					details: pricingResult,
					// Backward compatibility: keep discountAmount for legacy clients
					discountAmount: pricingResult.crossDiscount.totalDiscountAmount,
				};
			}),
		);

		return NextResponse.json(Array.isArray(body) ? results : results[0]);
	} catch (error) {
		logger.error("Failed to calculate pricing", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				storeId: params.storeId,
			},
			tags: ["api", "pricing", "error"],
		});

		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}

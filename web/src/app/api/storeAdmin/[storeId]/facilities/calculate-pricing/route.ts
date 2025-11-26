import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { format } from "date-fns";

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	try {
		CheckStoreAdminApiAccess(params.storeId);

		const body = await req.json();
		const { facilityId, rsvpTime } = body;

		if (!facilityId || !rsvpTime) {
			return NextResponse.json({
				cost: null,
				credit: null,
				pricingRuleId: null,
			});
		}

		// Get facility
		const facility = await sqlClient.storeFacility.findUnique({
			where: {
				id: facilityId,
			},
		});

		if (!facility) {
			return new NextResponse("Facility not found", { status: 404 });
		}

		// Parse rsvpTime
		const dateTime = new Date(rsvpTime);
		const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 6 = Saturday
		const timeStr = format(dateTime, "HH:mm"); // "HH:mm" format

		// Get all applicable pricing rules
		const rules = await sqlClient.facilityPricingRule.findMany({
			where: {
				storeId: params.storeId,
				isActive: true,
				OR: [
					{ facilityId: facilityId },
					{ facilityId: null }, // Store-wide rules
				],
			},
			orderBy: { priority: "desc" },
		});

		// Filter rules by day of week and time range
		const applicableRules = rules.filter((rule) => {
			// Check day of week
			if (rule.dayOfWeek) {
				let dayMatch = false;
				if (rule.dayOfWeek === "weekend") {
					dayMatch = dayOfWeek === 0 || dayOfWeek === 6;
				} else if (rule.dayOfWeek === "weekday") {
					dayMatch = dayOfWeek >= 1 && dayOfWeek <= 5;
				} else {
					try {
						const days = JSON.parse(rule.dayOfWeek) as number[];
						dayMatch = days.includes(dayOfWeek);
					} catch {
						// Invalid JSON, skip this rule
						return false;
					}
				}
				if (!dayMatch) {
					return false;
				}
			}

			// Check time range
			if (rule.startTime && rule.endTime) {
				const startTime = rule.startTime;
				const endTime = rule.endTime;
				// Simple time comparison (HH:mm format)
				// Handle time ranges that span midnight
				if (startTime > endTime) {
					// Time range spans midnight (e.g., 22:00 - 02:00)
					if (timeStr >= startTime || timeStr <= endTime) {
						return true;
					}
				} else {
					// Normal time range
					if (timeStr >= startTime && timeStr <= endTime) {
						return true;
					}
				}
				return false;
			} else if (rule.startTime || rule.endTime) {
				// Only one time specified, skip this rule (invalid)
				return false;
			}

			return true;
		});

		// Use the first matching rule (highest priority)
		const rule = applicableRules[0];

		let cost = facility.defaultCost;
		let credit = facility.defaultCredit;
		let pricingRuleId: string | null = null;

		if (rule) {
			cost = rule.cost ?? facility.defaultCost;
			credit = rule.credit ?? facility.defaultCredit;
			pricingRuleId = rule.id;
		}

		// Transform Decimal to numbers
		const result = {
			cost: cost ? Number(cost) : null,
			credit: credit ? Number(credit) : null,
			pricingRuleId,
		};

		return NextResponse.json(result);
	} catch (error) {
		logger.error("Failed to calculate facility pricing", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				storeId: params.storeId,
				facilityId: (req as any).body?.facilityId,
			},
			tags: ["api", "facility-pricing", "error"],
		});

		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}

import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { transformPrismaDataForJson } from "@/utils/utils";
import { format } from "date-fns";

interface PricingRequest {
	facilityId: string;
	rsvpTime: string;
}

interface PricingResult {
	cost: number | null;
	credit: number | null;
	pricingRuleId: string | null;
}

// Helper function to check if a rule applies to a given day and time
function isRuleApplicable(
	rule: {
		dayOfWeek: string | null;
		startTime: string | null;
		endTime: string | null;
	},
	dayOfWeek: number,
	timeStr: string,
): boolean {
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
}

// Calculate pricing for a single facility/time combination
function calculatePricingForRequest(
	facility: {
		id: string;
		defaultCost: unknown;
		defaultCredit: unknown;
	},
	rules: Array<{
		id: string;
		facilityId: string | null;
		cost: unknown;
		credit: unknown;
		dayOfWeek: string | null;
		startTime: string | null;
		endTime: string | null;
		priority: number;
	}>,
	dayOfWeek: number,
	timeStr: string,
): PricingResult {
	// Filter rules applicable to this facility
	const facilityRules = rules.filter((rule) => {
		// Rule applies if it's facility-specific or store-wide
		if (rule.facilityId && rule.facilityId !== facility.id) {
			return false;
		}
		// Check day and time
		return isRuleApplicable(rule, dayOfWeek, timeStr);
	});

	// Use the first matching rule (highest priority, already sorted)
	const rule = facilityRules[0];

	let cost = facility.defaultCost;
	let credit = facility.defaultCredit;
	let pricingRuleId: string | null = null;

	if (rule) {
		cost = rule.cost ?? facility.defaultCost;
		credit = rule.credit ?? facility.defaultCredit;
		pricingRuleId = rule.id;
	}

	return {
		cost: cost ? Number(cost) : null,
		credit: credit ? Number(credit) : null,
		pricingRuleId,
	};
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
		const requests: PricingRequest[] = Array.isArray(body)
			? body
			: body.facilityId && body.rsvpTime
				? [body]
				: [];

		if (requests.length === 0) {
			// Return empty result for backward compatibility
			return NextResponse.json({
				cost: null,
				credit: null,
				pricingRuleId: null,
			});
		}

		// Extract unique facility IDs
		const facilityIds = [...new Set(requests.map((r) => r.facilityId))];

		// Fetch all facilities in one query
		const facilities = await sqlClient.storeFacility.findMany({
			where: {
				id: { in: facilityIds },
				storeId: params.storeId,
			},
		});

		// Create a map for quick lookup
		const facilityMap = new Map(facilities.map((f) => [f.id, f]));

		// Fetch all pricing rules for this store in one query
		// Include both facility-specific and store-wide rules
		const allRules = await sqlClient.facilityPricingRule.findMany({
			where: {
				storeId: params.storeId,
				isActive: true,
				OR: [
					{ facilityId: { in: facilityIds } },
					{ facilityId: null }, // Store-wide rules
				],
			},
			orderBy: { priority: "desc" },
		});

		// Process all requests
		const results: PricingResult[] = requests.map((request) => {
			const facility = facilityMap.get(request.facilityId);

			if (!facility) {
				return {
					cost: null,
					credit: null,
					pricingRuleId: null,
				};
			}

			// Parse rsvpTime
			const dateTime = new Date(request.rsvpTime);
			if (isNaN(dateTime.getTime())) {
				return {
					cost: null,
					credit: null,
					pricingRuleId: null,
				};
			}

			const dayOfWeek = dateTime.getDay(); // 0 = Sunday, 6 = Saturday
			const timeStr = format(dateTime, "HH:mm"); // "HH:mm" format

			return calculatePricingForRequest(facility, allRules, dayOfWeek, timeStr);
		});

		// Return single result for backward compatibility, or array for batch
		return NextResponse.json(Array.isArray(body) ? results : results[0]);
	} catch (error) {
		logger.error("Failed to calculate facility pricing", {
			metadata: {
				error: error instanceof Error ? error.message : String(error),
				storeId: params.storeId,
				requestCount: Array.isArray((req as any).body)
					? (req as any).body.length
					: 1,
			},
			tags: ["api", "facility-pricing", "error"],
		});

		return new NextResponse(`Internal error: ${error}`, { status: 500 });
	}
}

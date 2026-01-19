import { sqlClient } from "@/lib/prismadb";
import { format } from "date-fns";

interface PricingParams {
	storeId: string;
	facilityId?: string | null;
	serviceStaffId?: string | null;
	rsvpTime: Date | number | bigint; // Can be Date object or timestamp
}

interface ItemCost {
	baseCost: number;
	discountedCost: number;
	baseCredit: number;
	discountedCredit: number;
	appliedRuleId?: string | null;
}

export interface DetailedPricingResult {
	totalCost: number;
	totalCredit: number;
	facility: ItemCost;
	serviceStaff: ItemCost;
	crossDiscount: {
		discountAmount: number;
		appliedRuleId?: string | null;
	};
}

// Helper: Check if a time-based rule applies
function isTimeRuleApplicable(
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
				return false;
			}
		}
		if (!dayMatch) return false;
	}

	// Check time range
	if (rule.startTime && rule.endTime) {
		const startTime = rule.startTime;
		const endTime = rule.endTime;
		if (startTime > endTime) {
			// Spans midnight
			if (timeStr >= startTime || timeStr <= endTime) return true;
		} else {
			if (timeStr >= startTime && timeStr <= endTime) return true;
		}
		return false;
	}

	return true;
}

export async function calculateRsvpPrice(
	params: PricingParams,
): Promise<DetailedPricingResult> {
	const { storeId, facilityId, serviceStaffId, rsvpTime } = params;

	// Normalize rsvpTime to Date
	let date: Date;
	if (typeof rsvpTime === "number" || typeof rsvpTime === "bigint") {
		date = new Date(Number(rsvpTime));
	} else {
		date = rsvpTime;
	}

	const dayOfWeek = date.getDay();
	const timeStr = format(date, "HH:mm");

	// 1. Fetch Resources
	const [facility, serviceStaff] = await Promise.all([
		facilityId
			? sqlClient.storeFacility.findUnique({
					where: { id: facilityId },
				})
			: null,
		serviceStaffId
			? sqlClient.serviceStaff.findUnique({
					where: { id: serviceStaffId },
				})
			: null,
	]);

	// Initialize Result
	const result: DetailedPricingResult = {
		totalCost: 0,
		totalCredit: 0,
		facility: {
			baseCost: facility?.defaultCost ? Number(facility.defaultCost) : 0,
			discountedCost: facility?.defaultCost ? Number(facility.defaultCost) : 0,
			baseCredit: facility?.defaultCredit ? Number(facility.defaultCredit) : 0,
			discountedCredit: facility?.defaultCredit
				? Number(facility.defaultCredit)
				: 0,
		},
		serviceStaff: {
			baseCost: serviceStaff?.defaultCost
				? Number(serviceStaff.defaultCost)
				: 0,
			discountedCost: serviceStaff?.defaultCost
				? Number(serviceStaff.defaultCost)
				: 0,
			baseCredit: serviceStaff?.defaultCredit
				? Number(serviceStaff.defaultCredit)
				: 0,
			discountedCredit: serviceStaff?.defaultCredit
				? Number(serviceStaff.defaultCredit)
				: 0,
		},
		crossDiscount: {
			discountAmount: 0,
		},
	};

	// 2. Apply Facility Pricing Rules (Time-based individual rules)
	if (facilityId && facility) {
		const facilityRules = await sqlClient.facilityPricingRule.findMany({
			where: {
				storeId,
				isActive: true,
				OR: [{ facilityId }, { facilityId: null }],
			},
			orderBy: { priority: "desc" },
		});

		const applicableRule = facilityRules.find((rule) =>
			isTimeRuleApplicable(rule, dayOfWeek, timeStr),
		);

		if (applicableRule) {
			result.facility.appliedRuleId = applicableRule.id;
			if (applicableRule.cost !== null) {
				result.facility.discountedCost = Number(applicableRule.cost);
			}
			if (applicableRule.credit !== null) {
				result.facility.discountedCredit = Number(applicableRule.credit);
			}
		}
	}

	// 3. Apply Cross Rules (Facility <-> Service Staff)
	// Only applicable if BOTH are selected, OR if the rule allows partial match (though current req implies selection of both usually triggers it, let's look at the schema)
	// Schema: facilityId?, serviceStaffId?
	// If rule has facilityId set, it matches that facility. If null, matches any.
	// same for staff.
	// Priority logic: Specific > General.
	// AND: The user selected items must match the rule criteria.

	if (facilityId || serviceStaffId) {
		const crossRules = await sqlClient.facilityServiceStaffPricingRule.findMany(
			{
				where: {
					storeId,
					isActive: true,
					// Logic: Find rules that *match* the current selection.
					// A rule matches if:
					// (rule.facilityId == selectedFacilityId OR rule.facilityId == null)
					// AND
					// (rule.serviceStaffId == selectedServiceStaffId OR rule.serviceStaffId == null)
					AND: [
						{
							OR: [
								{ facilityId: facilityId || null }, // If facilityId is selected, match exact or null. If not selected (null), match logic handles it?
								// Actually, if selected is null, we shouldn't match a rule that Requires a facility.
								// But here facilityId is passed as null if not selected.
								// So if rule.facilityId is 'A', and selected is null -> Mismatch.
								// If rule.facilityId is null, and selected is 'A' -> Match.
								// So: rule.facilityId == null OR rule.facilityId == selectedId
								{ facilityId: null },
							],
						},
						{
							OR: [
								{ serviceStaffId: serviceStaffId || null },
								{ serviceStaffId: null },
							],
						},
					],
				},
				orderBy: { priority: "desc" },
			},
		);

		// Find best matching rule (highest priority is already sorted)
		// We might want to prefer more specific rules (matches both IDs > matches one > matches none)
		// But let's trust priority field for now as per schema design or refining sort.
		// Let's refine sort in memory if needed, but priority should handle it.

		// However, we must ensure if a rule requires an item we didn't select
		// The query `facilityId: facilityId || null` handles:
		// - If we selected 'A': matches rule.facilityId == 'A'.
		// - The `{ facilityId: null }` matches rules that apply to ANY facility.

		// What if we selected NO facility? facilityId is null.
		// Query: `facilityId: null` matches rule.facilityId == null.
		// `facilityId: null` matches rule.facilityId == null.
		// So it matches generic rules. Correct.

		const validRules = crossRules.filter((rule) => {
			if (rule.facilityId && !facilityId) return false;
			if (rule.serviceStaffId && !serviceStaffId) return false;
			return true;
		});

		const appliedCrossRule = validRules[0]; // Highest priority

		if (appliedCrossRule) {
			result.crossDiscount.appliedRuleId = appliedCrossRule.id;

			// Apply discounts
			// These are fixed discount AMOUNTS (deducted from total), or overrides?
			// Schema says: `facilityDiscount Decimal`, `serviceStaffDiscount Decimal`.
			// Naming suggests it's a discount AMOUNT to subtract.
			// "apply discount to selected facility"

			const fDiscount = Number(appliedCrossRule.facilityDiscount);
			const sDiscount = Number(appliedCrossRule.serviceStaffDiscount);

			result.crossDiscount.discountAmount = fDiscount + sDiscount;
		}
	}

	// Final Calculation
	// Ensure we don't go below zero
	const rawTotal =
		result.facility.discountedCost + result.serviceStaff.discountedCost;
	const totalWithCrossDiscount = Math.max(
		0,
		rawTotal - result.crossDiscount.discountAmount,
	);

	const totalCredit =
		result.facility.discountedCredit + result.serviceStaff.discountedCredit;

	result.totalCost = totalWithCrossDiscount;
	result.totalCredit = totalCredit;

	return result;
}

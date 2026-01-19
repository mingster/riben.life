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
		facilityDiscount: number;
		serviceStaffDiscount: number;
		totalDiscountAmount: number;
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
			facilityDiscount: 0,
			serviceStaffDiscount: 0,
			totalDiscountAmount: 0,
		},
	};

	// Step 1: Apply Facility Pricing Rules (Time-based rules)
	// Check FacilityPricingRule against RSVP time
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

	// Step 2: Apply FacilityServiceStaffPricingRule when service staff is selected
	// Only check FacilityServiceStaffPricingRule when serviceStaffId is provided
	if (serviceStaffId) {
		// Build facility matching condition
		const facilityCondition = facilityId
			? [{ facilityId }, { facilityId: null }]
			: [{ facilityId: null }];

		const crossRules = await sqlClient.facilityServiceStaffPricingRule.findMany(
			{
				where: {
					storeId,
					isActive: true,
					// Match rules where:
					// - (rule.facilityId == selectedFacilityId OR rule.facilityId == null)
					//   AND
					// - (rule.serviceStaffId == selectedServiceStaffId OR rule.serviceStaffId == null)
					AND: [
						{
							OR: facilityCondition,
						},
						{
							OR: [
								// Match specific service staff or rules that apply to all service staff
								{ serviceStaffId },
								{ serviceStaffId: null },
							],
						},
					],
				},
				orderBy: { priority: "desc" },
			},
		);

		// Filter to ensure rules match the selected items
		// A rule with a specific facilityId should only match if that facility is selected
		// A rule with a specific serviceStaffId should only match if that service staff is selected
		const validRules = crossRules.filter((rule) => {
			// If rule specifies a facility, it must match the selected facility
			if (rule.facilityId && rule.facilityId !== facilityId) {
				return false;
			}
			// If rule specifies a service staff, it must match the selected service staff
			if (rule.serviceStaffId && rule.serviceStaffId !== serviceStaffId) {
				return false;
			}
			return true;
		});

		// Apply the highest priority matching rule
		const appliedCrossRule = validRules[0];

		if (appliedCrossRule) {
			result.crossDiscount.appliedRuleId = appliedCrossRule.id;

			// Apply discounts as fixed amounts (subtracted from total)
			const fDiscount = Number(appliedCrossRule.facilityDiscount);
			const sDiscount = Number(appliedCrossRule.serviceStaffDiscount);

			result.crossDiscount.facilityDiscount = fDiscount;
			result.crossDiscount.serviceStaffDiscount = sDiscount;
			result.crossDiscount.totalDiscountAmount = fDiscount + sDiscount;
		}
	}

	// Final Calculation
	// Apply cross discounts to individual items first, then calculate total
	// Ensure we don't go below zero for individual items
	const facilityCostAfterDiscount = Math.max(
		0,
		result.facility.discountedCost - result.crossDiscount.facilityDiscount,
	);
	const serviceStaffCostAfterDiscount = Math.max(
		0,
		result.serviceStaff.discountedCost -
			result.crossDiscount.serviceStaffDiscount,
	);

	// Update the discounted costs with cross discounts applied
	result.facility.discountedCost = facilityCostAfterDiscount;
	result.serviceStaff.discountedCost = serviceStaffCostAfterDiscount;

	// Calculate total cost
	const totalWithCrossDiscount =
		facilityCostAfterDiscount + serviceStaffCostAfterDiscount;

	const totalCredit =
		result.facility.discountedCredit + result.serviceStaff.discountedCredit;

	result.totalCost = totalWithCrossDiscount;
	result.totalCredit = totalCredit;

	return result;
}

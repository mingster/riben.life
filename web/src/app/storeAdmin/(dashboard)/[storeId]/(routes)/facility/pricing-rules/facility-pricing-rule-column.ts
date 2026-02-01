import type { FacilityPricingRule } from "@prisma/client";
import { epochToDate } from "@/utils/datetime-utils";

export interface FacilityPricingRuleColumn {
	id: string;
	storeId: string;
	facilityId: string | null;
	facilityName: string | null;
	name: string;
	priority: number;
	dayOfWeek: string | null;
	startTime: string | null;
	endTime: string | null;
	cost: number | null;
	credit: number | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export const mapFacilityPricingRuleToColumn = (
	rule: FacilityPricingRule & { Facility?: { facilityName: string } | null },
): FacilityPricingRuleColumn => ({
	id: rule.id,
	storeId: rule.storeId,
	facilityId: rule.facilityId,
	facilityName: rule.Facility?.facilityName || null,
	name: rule.name,
	priority: rule.priority,
	dayOfWeek: rule.dayOfWeek,
	startTime: rule.startTime,
	endTime: rule.endTime,
	cost:
		rule.cost != null
			? typeof rule.cost === "number"
				? rule.cost
				: (rule.cost as { toNumber: () => number }).toNumber()
			: null,
	credit:
		rule.credit != null
			? typeof rule.credit === "number"
				? rule.credit
				: (rule.credit as { toNumber: () => number }).toNumber()
			: null,
	isActive: rule.isActive,
	createdAt: epochToDate(rule.createdAt) ?? new Date(),
	updatedAt: epochToDate(rule.updatedAt) ?? new Date(),
});

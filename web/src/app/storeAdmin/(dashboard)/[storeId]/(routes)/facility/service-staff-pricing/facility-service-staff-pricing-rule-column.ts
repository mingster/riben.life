import type { FacilityServiceStaffPricingRule } from "@prisma/client";
import { epochToDate } from "@/utils/datetime-utils";

export interface FacilityServiceStaffPricingRuleColumn {
	id: string;
	storeId: string;
	facilityId: string | null;
	facilityName: string | null;
	serviceStaffId: string | null;
	serviceStaffName: string | null;
	facilityDiscount: number;
	serviceStaffDiscount: number;
	priority: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export const mapFacilityServiceStaffPricingRuleToColumn = (
	rule: FacilityServiceStaffPricingRule & {
		Facility?: { facilityName: string } | null;
		ServiceStaff?: { User: { name: string | null } } | null;
	},
): FacilityServiceStaffPricingRuleColumn => ({
	id: rule.id,
	storeId: rule.storeId,
	facilityId: rule.facilityId,
	facilityName: rule.Facility?.facilityName || null,
	serviceStaffId: rule.serviceStaffId,
	serviceStaffName: rule.ServiceStaff?.User?.name || null,
	facilityDiscount: rule.facilityDiscount.toNumber(),
	serviceStaffDiscount: rule.serviceStaffDiscount.toNumber(),
	priority: rule.priority,
	isActive: rule.isActive,
	createdAt: epochToDate(rule.createdAt) ?? new Date(),
	updatedAt: epochToDate(rule.updatedAt) ?? new Date(),
});

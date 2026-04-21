import type { CreditBonusRule } from "@prisma/client";
import { epochToDate } from "@/utils/datetime-utils";

export interface CreditBonusRuleColumn {
	id: string;
	storeId: string;
	threshold: number;
	bonus: number;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
}

function decimalFieldToNumber(value: unknown): number {
	if (typeof value === "number") {
		return value;
	}
	if (
		value !== null &&
		typeof value === "object" &&
		"toNumber" in value &&
		typeof (value as { toNumber: () => number }).toNumber === "function"
	) {
		return (value as { toNumber: () => number }).toNumber();
	}
	return Number(value);
}

export const mapCreditBonusRuleToColumn = (
	rule: CreditBonusRule,
): CreditBonusRuleColumn => ({
	id: rule.id,
	storeId: rule.storeId,
	threshold: decimalFieldToNumber(rule.threshold),
	bonus: decimalFieldToNumber(rule.bonus),
	isActive: rule.isActive,
	createdAt: epochToDate(rule.createdAt) ?? new Date(),
	updatedAt: epochToDate(rule.updatedAt) ?? new Date(),
});

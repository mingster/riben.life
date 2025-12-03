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

export const mapCreditBonusRuleToColumn = (
	rule: CreditBonusRule,
): CreditBonusRuleColumn => ({
	id: rule.id,
	storeId: rule.storeId,
	threshold: rule.threshold.toNumber(),
	bonus: rule.bonus.toNumber(),
	isActive: rule.isActive,
	createdAt: epochToDate(rule.createdAt) ?? new Date(),
	updatedAt: epochToDate(rule.updatedAt) ?? new Date(),
});

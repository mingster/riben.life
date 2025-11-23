"use server";

import { mapCreditBonusRuleToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/credit-bonus-rule/credit-bonus-rule-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { updateCreditBonusRuleSchema } from "./update-credit-bonus-rule.validation";

export const updateCreditBonusRuleAction = storeActionClient
	.metadata({ name: "updateCreditBonusRule" })
	.schema(updateCreditBonusRuleSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id, threshold, bonus, isActive } = parsedInput;

		const rule = await sqlClient.creditBonusRule.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rule || rule.storeId !== storeId) {
			throw new SafeError("Credit bonus rule not found");
		}

		try {
			const updated = await sqlClient.creditBonusRule.update({
				where: { id },
				data: {
					threshold: new Prisma.Decimal(threshold),
					bonus: new Prisma.Decimal(bonus),
					isActive,
				},
			});

			return {
				rule: mapCreditBonusRuleToColumn(updated),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Credit bonus rule already exists.");
			}

			throw error;
		}
	});

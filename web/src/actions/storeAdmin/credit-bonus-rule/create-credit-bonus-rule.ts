"use server";

import { mapCreditBonusRuleToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/credit-bonus-rule/credit-bonus-rule-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

import { createCreditBonusRuleSchema } from "./create-credit-bonus-rule.validation";

export const createCreditBonusRuleAction = storeActionClient
	.metadata({ name: "createCreditBonusRule" })
	.schema(createCreditBonusRuleSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { threshold, bonus, isActive } = parsedInput;

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		try {
			const rule = await sqlClient.creditBonusRule.create({
				data: {
					storeId,
					threshold: new Prisma.Decimal(threshold),
					bonus: new Prisma.Decimal(bonus),
					isActive,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
			});

			return {
				rule: mapCreditBonusRuleToColumn(rule),
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

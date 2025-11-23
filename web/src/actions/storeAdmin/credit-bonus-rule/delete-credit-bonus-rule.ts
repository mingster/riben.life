"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";

import { deleteCreditBonusRuleSchema } from "./delete-credit-bonus-rule.validation";

export const deleteCreditBonusRuleAction = storeActionClient
	.metadata({ name: "deleteCreditBonusRule" })
	.schema(deleteCreditBonusRuleSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const rule = await sqlClient.creditBonusRule.findUnique({
			where: { id },
			select: { id: true, storeId: true },
		});

		if (!rule || rule.storeId !== storeId) {
			throw new SafeError("Credit bonus rule not found");
		}

		await sqlClient.creditBonusRule.delete({
			where: { id },
		});

		return { id };
	});

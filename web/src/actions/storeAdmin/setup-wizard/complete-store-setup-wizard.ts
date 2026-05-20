"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { z } from "zod";

const schema = z.object({});

export const completeStoreSetupWizardAction = storeActionClient
	.metadata({ name: "completeStoreSetupWizard" })
	.schema(schema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const now = getUtcNowEpoch();

		await sqlClient.storeSettings.upsert({
			where: { storeId },
			create: {
				storeId,
				setupWizardCompletedAt: now,
				setupWizardDismissedAt: null,
				createdAt: now,
				updatedAt: now,
			},
			update: {
				setupWizardCompletedAt: now,
				setupWizardDismissedAt: null,
				updatedAt: now,
			},
		});

		return { completedAt: now };
	});

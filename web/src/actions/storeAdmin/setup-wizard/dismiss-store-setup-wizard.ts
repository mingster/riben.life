"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { z } from "zod";

const schema = z.object({});

export const dismissStoreSetupWizardAction = storeActionClient
	.metadata({ name: "dismissStoreSetupWizard" })
	.schema(schema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const now = getUtcNowEpoch();

		await sqlClient.storeSettings.upsert({
			where: { storeId },
			create: {
				storeId,
				setupWizardDismissedAt: now,
				createdAt: now,
				updatedAt: now,
			},
			update: {
				setupWizardDismissedAt: now,
				updatedAt: now,
			},
		});

		return { dismissedAt: now };
	});

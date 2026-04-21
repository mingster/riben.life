"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateStorePoliciesContentSchema } from "./update-store-policies-content.validation";

function mergeField(
	incoming: string | undefined,
	existing: string | null | undefined,
): string {
	return incoming !== undefined ? (incoming ?? "") : (existing ?? "");
}

export const updateStorePoliciesContentAction = storeActionClient
	.metadata({ name: "updateStorePoliciesContent" })
	.schema(updateStorePoliciesContentSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		const store = await sqlClient.store.findFirst({
			where: { id: storeId, isDeleted: false },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const existing = await sqlClient.storeSettings.findUnique({
			where: { storeId },
		});

		const now = getUtcNowEpoch();

		const data = {
			privacyPolicy: mergeField(
				parsedInput.privacyPolicy,
				existing?.privacyPolicy,
			),
			tos: mergeField(parsedInput.tos, existing?.tos),
			storefrontShippingPolicy: mergeField(
				parsedInput.storefrontShippingPolicy,
				existing?.storefrontShippingPolicy,
			),
			storefrontReturnPolicy: mergeField(
				parsedInput.storefrontReturnPolicy,
				existing?.storefrontReturnPolicy,
			),
			storefrontGiftingContent: mergeField(
				parsedInput.storefrontGiftingContent,
				existing?.storefrontGiftingContent,
			),
		};

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: { storeId },
			update: {
				...data,
				updatedAt: now,
			},
			create: {
				storeId,
				...data,
				createdAt: now,
				updatedAt: now,
			},
		});

		transformPrismaDataForJson(storeSettings);

		return { storeSettings };
	});

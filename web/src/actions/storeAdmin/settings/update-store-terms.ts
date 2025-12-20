"use server";

import { updateStoreTermsSchema } from "./update-store-terms.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

export const updateStoreTermsAction = storeActionClient
	.metadata({ name: "updateStoreTerms" })
	.schema(updateStoreTermsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { tos } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		await sqlClient.store.findFirstOrThrow({
			where: {
				id: storeId,
				ownerId: userId,
			},
			select: { id: true },
		});

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: { storeId },
			update: {
				tos: tos ?? "",
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				storeId,
				tos: tos ?? "",
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		// Transform Decimal objects to numbers for client components
		transformPrismaDataForJson(storeSettings);

		return { storeSettings };
	});

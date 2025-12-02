"use server";

import { updateStorePrivacySchema } from "./update-store-privacy.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { getUtcNow } from "@/utils/datetime-utils";

export const updateStorePrivacyAction = storeActionClient
	.metadata({ name: "updateStorePrivacy" })
	.schema(updateStorePrivacySchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { privacyPolicy, tos } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Ensure store belongs to the user
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
				privacyPolicy: privacyPolicy ?? "",
				tos: tos ?? "",
				updatedAt: getUtcNow(),
			},
			create: {
				storeId,
				privacyPolicy: privacyPolicy ?? "",
				tos: tos ?? "",
			},
		});

		return { storeSettings };
	});

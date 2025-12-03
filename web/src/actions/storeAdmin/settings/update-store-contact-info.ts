"use server";

import { updateStoreContactInfoSchema } from "./update-store-contact-info.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

export const updateStoreContactInfoAction = storeActionClient
	.metadata({ name: "updateStoreContactInfo" })
	.schema(updateStoreContactInfoSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { ...contactInfo } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		// Ensure store belongs to user
		await sqlClient.store.findFirstOrThrow({
			where: {
				id: storeId,
				ownerId: userId,
			},
			select: { id: true },
		});

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: { storeId },
			update: { ...contactInfo, updatedAt: getUtcNowEpoch() },
			create: {
				storeId,
				...contactInfo,
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		return { storeSettings };
	});

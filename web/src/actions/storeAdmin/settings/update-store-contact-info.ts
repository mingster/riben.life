"use server";

import { updateStoreContactInfoSchema } from "./update-store-contact-info.validation";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { sqlClient } from "@/lib/prismadb";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { getUtcNow } from "@/utils/datetime-utils";

export const updateStoreContactInfoAction = storeOwnerActionClient
	.metadata({ name: "updateStoreContactInfo" })
	.schema(updateStoreContactInfoSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, ...contactInfo } = parsedInput;

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
			update: { ...contactInfo, updatedAt: getUtcNow() },
			create: {
				storeId,
				...contactInfo,
			},
		});

		return { storeSettings };
	});

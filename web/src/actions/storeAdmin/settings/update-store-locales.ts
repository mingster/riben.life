"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateStoreLocalesSchema } from "./update-store-locales.validation";

export const updateStoreLocalesAction = storeActionClient
	.metadata({ name: "updateStoreLocales" })
	.schema(updateStoreLocalesSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { supportedLocales } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		const store = await sqlClient.store.update({
			where: {
				id: storeId,
			},
			data: {
				supportedLocales,
				updatedAt: getUtcNowEpoch(),
			},
		});

		transformPrismaDataForJson(store);

		return store;
	});

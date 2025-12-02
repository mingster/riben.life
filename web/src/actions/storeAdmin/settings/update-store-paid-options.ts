"use server";

import { updateStorePaidOptionsSchema } from "./update-store-paid-options.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";

export const updateStorePaidOptionsAction = storeActionClient
	.metadata({ name: "updateStorePaidOptions" })
	.schema(updateStorePaidOptionsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			customDomain,
			LINE_PAY_ID,
			LINE_PAY_SECRET,
			STRIPE_SECRET_KEY,
			logo,
			logoPublicId,
			acceptAnonymousOrder,
			defaultTimezone,
		} = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		const existingStore = await sqlClient.store.findUniqueOrThrow({
			where: {
				id: storeId,
				ownerId: userId,
			},
		});

		const store = await sqlClient.store.update({
			where: {
				id: storeId,
				ownerId: userId,
			},
			data: {
				customDomain: customDomain ?? "",
				LINE_PAY_ID: LINE_PAY_ID ?? "",
				LINE_PAY_SECRET: LINE_PAY_SECRET ?? "",
				STRIPE_SECRET_KEY: STRIPE_SECRET_KEY ?? "",
				logo: logo ?? "",
				logoPublicId: logoPublicId ?? "",
				acceptAnonymousOrder:
					acceptAnonymousOrder ?? existingStore.acceptAnonymousOrder,
				defaultTimezone: defaultTimezone ?? existingStore.defaultTimezone,
			},
		});

		return { store };
	});

"use server";

import { updateStoreBasicSchema } from "./update-store-basic.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { transformPrismaDataForJson } from "@/utils/utils";

export const updateStoreBasicAction = storeActionClient
	.metadata({ name: "updateStoreBasic" })
	.schema(updateStoreBasicSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			name,
			orderNoteToCustomer,
			defaultLocale,
			defaultCountry,
			defaultCurrency,
			defaultTimezone = "Asia/Taipei",
			autoAcceptOrder = false,
			isOpen = false,
			acceptAnonymousOrder = true,
			useBusinessHours = true,
			businessHours = "",
			requireSeating = false,
			requirePrepaid = true,
		} = parsedInput;

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
				ownerId: userId,
			},
			data: {
				name,
				defaultLocale,
				defaultCountry,
				defaultCurrency,
				defaultTimezone,
				autoAcceptOrder,
				isOpen,
				acceptAnonymousOrder,
				useBusinessHours,
				requireSeating,
				requirePrepaid,
				updatedAt: getUtcNowEpoch(),
			},
		});

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: { storeId },
			update: {
				orderNoteToCustomer: orderNoteToCustomer ?? "",
				businessHours: businessHours ?? "",
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				storeId,
				orderNoteToCustomer: orderNoteToCustomer ?? "",
				businessHours: businessHours ?? "",
				createdAt: getUtcNowEpoch(),
				updatedAt: getUtcNowEpoch(),
			},
		});

		transformPrismaDataForJson(store);
		transformPrismaDataForJson(storeSettings);

		return {
			store,
			storeSettings,
		};
	});

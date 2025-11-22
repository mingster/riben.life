"use server";

import { updateStoreBasicSchema } from "./update-store-basic.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNow } from "@/utils/datetime-utils";
import { transformDecimalsToNumbers } from "@/utils/utils";

export const updateStoreBasicAction = storeActionClient
	.metadata({ name: "updateStoreBasic" })
	.schema(updateStoreBasicSchema)
	.action(async ({ parsedInput }) => {
		const {
			storeId,
			name,
			orderNoteToCustomer,
			defaultLocale,
			defaultCountry,
			defaultCurrency,
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
				autoAcceptOrder,
				isOpen,
				acceptAnonymousOrder,
				useBusinessHours,
				requireSeating,
				requirePrepaid,
				updatedAt: getUtcNow(),
			},
		});

		const storeSettings = await sqlClient.storeSettings.upsert({
			where: { storeId },
			update: {
				orderNoteToCustomer: orderNoteToCustomer ?? "",
				businessHours: businessHours ?? "",
				updatedAt: getUtcNow(),
			},
			create: {
				storeId,
				orderNoteToCustomer: orderNoteToCustomer ?? "",
				businessHours: businessHours ?? "",
			},
		});

		transformDecimalsToNumbers(store);
		transformDecimalsToNumbers(storeSettings);

		return {
			store,
			storeSettings,
		};
	});

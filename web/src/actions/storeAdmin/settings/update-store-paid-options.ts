"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { updateStorePaidOptionsSchema } from "./update-store-paid-options.validation";

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
			PAYPAL_CLIENT_ID,
			PAYPAL_CLIENT_SECRET,
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

		const str = (
			incoming: string | null | undefined,
			existing: string | null | undefined,
		) => (incoming !== undefined ? (incoming ?? "") : (existing ?? ""));

		const store = await sqlClient.store.update({
			where: {
				id: storeId,
				ownerId: userId,
			},
			data: {
				customDomain: str(customDomain, existingStore.customDomain),
				LINE_PAY_ID: str(LINE_PAY_ID, existingStore.LINE_PAY_ID),
				LINE_PAY_SECRET: str(LINE_PAY_SECRET, existingStore.LINE_PAY_SECRET),
				STRIPE_SECRET_KEY: str(
					STRIPE_SECRET_KEY,
					existingStore.STRIPE_SECRET_KEY,
				),
				PAYPAL_CLIENT_ID: str(PAYPAL_CLIENT_ID, existingStore.PAYPAL_CLIENT_ID),
				PAYPAL_CLIENT_SECRET: str(
					PAYPAL_CLIENT_SECRET,
					existingStore.PAYPAL_CLIENT_SECRET,
				),
				logo: str(logo, existingStore.logo),
				logoPublicId: str(logoPublicId, existingStore.logoPublicId),
				acceptAnonymousOrder:
					acceptAnonymousOrder ?? existingStore.acceptAnonymousOrder,
				defaultTimezone: str(defaultTimezone, existingStore.defaultTimezone),
			},
		});

		// Transform Decimal objects to numbers for client components
		transformPrismaDataForJson(store);

		return { store };
	});

"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { parsePaymentCredentials } from "@/lib/payment/payment-credentials";
import { storeActionClient } from "@/utils/actions/safe-action";
import { SafeError } from "@/utils/error";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
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
			NEWEBPAY_MERCHANT_ID,
			NEWEBPAY_HASH_KEY,
			NEWEBPAY_HASH_IV,
			acceptAnonymousOrder,
			defaultTimezone,
			payoutSchedule,
			bankCode,
			bankAccount,
			bankAccountName,
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

		const existing = parsePaymentCredentials(existingStore.paymentCredentials);
		const merge = (
			incoming: string | null | undefined,
			existingVal: string | undefined,
		) => (incoming !== undefined ? (incoming ?? "") : (existingVal ?? ""));

		const paymentCredentials = {
			linepay: {
				id: merge(LINE_PAY_ID, existing.linepay?.id),
				secret: merge(LINE_PAY_SECRET, existing.linepay?.secret),
			},
			stripe: {
				secretKey: merge(STRIPE_SECRET_KEY, existing.stripe?.secretKey),
			},
			paypal: {
				clientId: merge(PAYPAL_CLIENT_ID, existing.paypal?.clientId),
				clientSecret: merge(
					PAYPAL_CLIENT_SECRET,
					existing.paypal?.clientSecret,
				),
			},
			newebpay: {
				merchantId: merge(NEWEBPAY_MERCHANT_ID, existing.newebpay?.merchantId),
				hashKey: merge(NEWEBPAY_HASH_KEY, existing.newebpay?.hashKey),
				hashIV: merge(NEWEBPAY_HASH_IV, existing.newebpay?.hashIV),
			},
		};

		const store = await sqlClient.store.update({
			where: {
				id: storeId,
				ownerId: userId,
			},
			data: {
				customDomain: str(customDomain, existingStore.customDomain),
				paymentCredentials,
				acceptAnonymousOrder:
					acceptAnonymousOrder ?? existingStore.acceptAnonymousOrder,
				defaultTimezone: str(defaultTimezone, existingStore.defaultTimezone),
				payoutSchedule,
				bankCode,
				bankAccount,
				bankAccountName,
				updatedAt: getUtcNowEpoch(),
			},
		});

		transformPrismaDataForJson(store);

		return { store };
	});

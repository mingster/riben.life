"use server";

import { updateStoreCreditSchema } from "./update-store-credit.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getStoreWithRelations } from "@/lib/store-access";
import { Store } from "@/types";

export const updateStoreCreditAction = storeActionClient
	.metadata({ name: "updateStoreCredit" })
	.schema(updateStoreCreditSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			useCustomerCredit,
			creditExchangeRate,
			creditServiceExchangeRate,
			creditMaxPurchase,
			creditMinPurchase,
			creditExpiration,
		} = parsedInput;

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

		const updated = await sqlClient.store.update({
			where: { id: storeId },
			data: {
				useCustomerCredit,
				creditExchangeRate: new Prisma.Decimal(creditExchangeRate),
				creditServiceExchangeRate: new Prisma.Decimal(
					creditServiceExchangeRate,
				),
				creditMaxPurchase: new Prisma.Decimal(creditMaxPurchase),
				creditMinPurchase: new Prisma.Decimal(creditMinPurchase),
				creditExpiration,
				updatedAt: getUtcNowEpoch(),
			},
		});

		const store = await getStoreWithRelations(updated.id, {});
		transformPrismaDataForJson(store as Store);

		return { store: store as Store };
	});

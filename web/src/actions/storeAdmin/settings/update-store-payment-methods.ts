"use server";

import { updateStorePaymentMethodsSchema } from "./update-store-payment-methods.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";

export const updateStorePaymentMethodsAction = storeActionClient
	.metadata({ name: "updateStorePaymentMethods" })
	.schema(updateStorePaymentMethodsSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, methodIds } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});

		const userId = session?.user?.id;

		if (typeof userId !== "string") {
			throw new SafeError("Unauthorized");
		}

		await sqlClient.store.findFirstOrThrow({
			where: {
				id: storeId,
				ownerId: userId,
			},
			select: { id: true },
		});

		await sqlClient.$transaction(async (tx) => {
			await tx.storePaymentMethodMapping.deleteMany({
				where: { storeId },
			});

			if (methodIds.length > 0) {
				await tx.storePaymentMethodMapping.createMany({
					data: methodIds.map((methodId) => ({
						storeId,
						methodId,
					})),
				});
			}
		});

		const store = await sqlClient.store.findUniqueOrThrow({
			where: { id: storeId },
			include: {
				StorePaymentMethods: {
					include: {
						PaymentMethod: true,
					},
				},
			},
		});

		return { store };
	});

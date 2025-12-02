"use server";

import { updateStoreShippingMethodsSchema } from "./update-store-shipping-methods.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";

export const updateStoreShippingMethodsAction = storeActionClient
	.metadata({ name: "updateStoreShippingMethods" })
	.schema(updateStoreShippingMethodsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { methodIds } = parsedInput;

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
			await tx.storeShipMethodMapping.deleteMany({
				where: { storeId },
			});

			if (methodIds.length > 0) {
				await tx.storeShipMethodMapping.createMany({
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
				StoreShippingMethods: {
					include: {
						ShippingMethod: true,
					},
				},
			},
		});

		return { store };
	});

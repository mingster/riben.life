"use server";

import { updateStorePaymentMethodsSchema } from "./update-store-payment-methods.validation";
import { storeActionClient } from "@/utils/actions/safe-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { SafeError } from "@/utils/error";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import "@/lib/payment/plugins";
import { paymentPluginRegistry } from "@/lib/payment/plugins/registry";

export const updateStorePaymentMethodsAction = storeActionClient
	.metadata({ name: "updateStorePaymentMethods" })
	.schema(updateStorePaymentMethodsSchema)
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
			const approvedMethods = await tx.paymentMethod.findMany({
				where: {
					id: { in: methodIds },
					isDeleted: false,
					platformEnabled: true,
					visibleToCustomer: true,
					payUrl: { in: paymentPluginRegistry.getIdentifiers() },
				},
				select: { id: true },
			});
			const approvedMethodIds = new Set(
				approvedMethods.map((method) => method.id),
			);

			await tx.storePaymentMethodMapping.deleteMany({
				where: { storeId },
			});

			if (approvedMethodIds.size > 0) {
				await tx.storePaymentMethodMapping.createMany({
					data: methodIds
						.filter((methodId) => approvedMethodIds.has(methodId))
						.map((methodId) => ({
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

		// Transform Decimal objects to numbers for client components
		transformPrismaDataForJson(store);

		return { store };
	});

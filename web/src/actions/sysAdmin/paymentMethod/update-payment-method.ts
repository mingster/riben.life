"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updatePaymentMethodSchema } from "./update-payment-method.validation";
import { mapPaymentMethodToColumn } from "@/app/sysAdmin/paymentMethods/payment-method-column";

export const updatePaymentMethodAction = adminActionClient
	.metadata({ name: "updatePaymentMethod" })
	.schema(updatePaymentMethodSchema)
	.action(async ({ parsedInput }) => {
		const {
			id,
			name,
			payUrl,
			priceDescr,
			fee,
			feeAdditional,
			clearDays,
			isDeleted,
			isDefault,
			canDelete,
			visibleToCustomer,
		} = parsedInput;

		const existing = await sqlClient.paymentMethod.findUnique({
			where: { id },
		});

		if (!existing) {
			throw new SafeError("Payment method not found");
		}

		// Check if name is being changed and if new name already exists
		if (name !== existing.name) {
			const nameExists = await sqlClient.paymentMethod.findUnique({
				where: { name },
			});

			if (nameExists) {
				throw new SafeError("Payment method with this name already exists");
			}
		}

		try {
			const updated = await sqlClient.paymentMethod.update({
				where: { id },
				data: {
					name,
					payUrl: payUrl || "",
					priceDescr: priceDescr || "",
					fee: new Prisma.Decimal(fee),
					feeAdditional: new Prisma.Decimal(feeAdditional),
					clearDays,
					isDeleted,
					isDefault,
					canDelete,
					visibleToCustomer,
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					_count: {
						select: {
							StorePaymentMethodMapping: true,
							StoreOrder: true,
						},
					},
				},
			});

			const transformed = mapPaymentMethodToColumn(updated);
			transformPrismaDataForJson(transformed);

			return {
				paymentMethod: transformed,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Payment method already exists.");
			}

			throw error;
		}
	});

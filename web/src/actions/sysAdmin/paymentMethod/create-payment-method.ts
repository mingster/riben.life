"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { createPaymentMethodSchema } from "./create-payment-method.validation";
import { mapPaymentMethodToColumn } from "@/app/sysAdmin/paymentMethods/payment-method-column";

export const createPaymentMethodAction = adminActionClient
	.metadata({ name: "createPaymentMethod" })
	.schema(createPaymentMethodSchema)
	.action(async ({ parsedInput }) => {
		const {
			name,
			payUrl,
			priceDescr,
			fee,
			feeAdditional,
			clearDays,
			isDeleted,
			isDefault,
			canDelete,
		} = parsedInput;

		// Check if name already exists
		const existing = await sqlClient.paymentMethod.findUnique({
			where: { name },
		});

		if (existing) {
			throw new SafeError("Payment method with this name already exists");
		}

		try {
			const paymentMethod = await sqlClient.paymentMethod.create({
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
					createdAt: getUtcNowEpoch(),
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

			const transformed = mapPaymentMethodToColumn(paymentMethod);
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

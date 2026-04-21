"use server";

import { Prisma } from "@prisma/client";
import { mapPaymentMethodToColumn } from "@/app/sysAdmin/paymentMethods/payment-method-column";
import { sqlClient } from "@/lib/prismadb";
import { adminActionClient } from "@/utils/actions/safe-action";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { createPaymentMethodSchema } from "./create-payment-method.validation";

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
			visibleToCustomer,
			platformEnabled,
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
					visibleToCustomer,
					platformEnabled,
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

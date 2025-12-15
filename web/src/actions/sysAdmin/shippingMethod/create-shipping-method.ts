"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { createShippingMethodSchema } from "./create-shipping-method.validation";
import { mapShippingMethodToColumn } from "@/app/sysAdmin/shipMethods/shipping-method-column";

export const createShippingMethodAction = adminActionClient
	.metadata({ name: "createShippingMethod" })
	.schema(createShippingMethodSchema)
	.action(async ({ parsedInput }) => {
		const {
			name,
			identifier,
			description,
			basic_price,
			currencyId,
			isDeleted,
			isDefault,
			shipRequired,
			canDelete,
		} = parsedInput;

		// Check if name already exists
		const existing = await sqlClient.shippingMethod.findUnique({
			where: { name },
		});

		if (existing) {
			throw new SafeError("Shipping method with this name already exists");
		}

		try {
			const shippingMethod = await sqlClient.shippingMethod.create({
				data: {
					name,
					identifier: identifier || "",
					description: description || null,
					basic_price: new Prisma.Decimal(basic_price),
					currencyId: currencyId || "twd",
					isDeleted,
					isDefault,
					shipRequired,
					canDelete,
					createdAt: getUtcNowEpoch(),
					updatedAt: getUtcNowEpoch(),
				},
				include: {
					_count: {
						select: {
							stores: true,
							StoreOrder: true,
							Shipment: true,
						},
					},
				},
			});

			const transformed = mapShippingMethodToColumn(shippingMethod);
			transformPrismaDataForJson(transformed);

			return {
				shippingMethod: transformed,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Shipping method already exists.");
			}

			throw error;
		}
	});

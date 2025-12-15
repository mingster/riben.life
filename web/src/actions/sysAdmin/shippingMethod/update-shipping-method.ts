"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { updateShippingMethodSchema } from "./update-shipping-method.validation";
import { mapShippingMethodToColumn } from "@/app/sysAdmin/shipMethods/shipping-method-column";

export const updateShippingMethodAction = adminActionClient
	.metadata({ name: "updateShippingMethod" })
	.schema(updateShippingMethodSchema)
	.action(async ({ parsedInput }) => {
		const {
			id,
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

		const existing = await sqlClient.shippingMethod.findUnique({
			where: { id },
		});

		if (!existing) {
			throw new SafeError("Shipping method not found");
		}

		// Check if name is being changed and if new name already exists
		if (name !== existing.name) {
			const nameExists = await sqlClient.shippingMethod.findUnique({
				where: { name },
			});

			if (nameExists) {
				throw new SafeError("Shipping method with this name already exists");
			}
		}

		try {
			const updated = await sqlClient.shippingMethod.update({
				where: { id },
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

			const transformed = mapShippingMethodToColumn(updated);
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

"use server";

import { Prisma } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { deleteShippingMethodSchema } from "./delete-shipping-method.validation";

export const deleteShippingMethodAction = adminActionClient
	.metadata({ name: "deleteShippingMethod" })
	.schema(deleteShippingMethodSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

		const existing = await sqlClient.shippingMethod.findUnique({
			where: { id },
			select: { id: true, name: true },
		});

		if (!existing) {
			throw new SafeError("Shipping method not found");
		}

		const orderCount = await sqlClient.storeOrder.count({
			where: { shippingMethodId: id },
		});

		if (orderCount > 0) {
			throw new SafeError(
				`Cannot delete shipping method "${existing.name}": ${orderCount} order(s) use it.`,
			);
		}

		const shipmentCount = await sqlClient.shipment.count({
			where: { shippingMethodId: id },
		});

		if (shipmentCount > 0) {
			throw new SafeError(
				`Cannot delete shipping method "${existing.name}": ${shipmentCount} shipment(s) still reference it.`,
			);
		}

		try {
			await sqlClient.$transaction(async (tx) => {
				await tx.storeShipMethodMapping.deleteMany({
					where: { methodId: id },
				});
				await tx.shippingMethodPrice.deleteMany({
					where: { methodId: id },
				});
				await tx.shippingMethod.delete({
					where: { id },
				});
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2003"
			) {
				throw new SafeError(
					"Cannot delete this shipping method: it is still referenced by another record.",
				);
			}
			throw error;
		}

		return {
			id,
		};
	});

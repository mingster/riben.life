"use server";

import { Prisma } from "@prisma/client";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { deletePaymentMethodSchema } from "./delete-payment-method.validation";

export const deletePaymentMethodAction = adminActionClient
	.metadata({ name: "deletePaymentMethod" })
	.schema(deletePaymentMethodSchema)
	.action(async ({ parsedInput }) => {
		const { id } = parsedInput;

		const existing = await sqlClient.paymentMethod.findUnique({
			where: { id },
			select: { id: true, name: true },
		});

		if (!existing) {
			throw new SafeError("Payment method not found");
		}

		const orderCount = await sqlClient.storeOrder.count({
			where: { paymentMethodId: id },
		});

		if (orderCount > 0) {
			throw new SafeError(
				`Cannot delete payment method "${existing.name}": ${orderCount} order(s) reference it. Change those orders first.`,
			);
		}

		try {
			await sqlClient.paymentMethod.delete({
				where: { id },
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2003"
			) {
				throw new SafeError(
					"Cannot delete this payment method: it is still referenced by another record.",
				);
			}
			throw error;
		}

		return {
			id,
		};
	});

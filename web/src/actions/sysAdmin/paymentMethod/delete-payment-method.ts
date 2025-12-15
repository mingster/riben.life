"use server";

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
			select: { id: true },
		});

		if (!existing) {
			throw new SafeError("Payment method not found");
		}

		await sqlClient.paymentMethod.delete({
			where: { id },
		});

		return {
			id,
		};
	});

"use server";

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
			select: { id: true },
		});

		if (!existing) {
			throw new SafeError("Shipping method not found");
		}

		await sqlClient.shippingMethod.delete({
			where: { id },
		});

		return {
			id,
		};
	});

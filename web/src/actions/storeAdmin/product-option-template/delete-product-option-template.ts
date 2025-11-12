"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeOwnerActionClient } from "@/utils/actions/safe-action";
import { deleteProductOptionTemplateSchema } from "./delete-product-option-template.validation";

export const deleteProductOptionTemplateAction = storeOwnerActionClient
	.metadata({ name: "deleteProductOptionTemplate" })
	.schema(deleteProductOptionTemplateSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, id } = parsedInput;

		const existing = await sqlClient.storeProductOptionTemplate.findFirst({
			where: {
				id,
				storeId,
			},
			select: {
				id: true,
			},
		});

		if (!existing) {
			throw new SafeError("Option template not found");
		}

		await sqlClient.$transaction(async (tx) => {
			await tx.storeProductOptionSelectionsTemplate.deleteMany({
				where: { optionId: id },
			});
			await tx.storeProductOptionTemplate.delete({
				where: { id },
			});
		});

		return {
			id,
		};
	});

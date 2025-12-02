"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { deleteProductOptionTemplateSchema } from "./delete-product-option-template.validation";

export const deleteProductOptionTemplateAction = storeActionClient
	.metadata({ name: "deleteProductOptionTemplate" })
	.schema(deleteProductOptionTemplateSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { id } = parsedInput;

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

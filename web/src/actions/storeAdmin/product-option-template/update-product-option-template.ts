"use server";

import { mapProductOptionTemplateToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/product-option-template/product-option-template-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { updateProductOptionTemplateSchema } from "./update-product-option-template.validation";

interface SelectionInput {
	name: string;
	price: number;
	isDefault: boolean;
}

const parseSelections = (input: string): SelectionInput[] => {
	return input
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => {
			const [nameRaw = "", priceRaw = "0", defaultRaw = "0"] = line.split(":");
			const name = nameRaw.trim();

			if (!name) {
				return null;
			}

			const price = Number.parseFloat(priceRaw.trim() || "0");
			const isDefault = defaultRaw.trim() === "1";

			return {
				name,
				price: Number.isNaN(price) ? 0 : price,
				isDefault,
			};
		})
		.filter((value): value is SelectionInput => value !== null);
};

export const updateProductOptionTemplateAction = storeActionClient
	.metadata({ name: "updateProductOptionTemplate" })
	.schema(updateProductOptionTemplateSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			optionName,
			isRequired,
			isMultiple,
			minSelection,
			maxSelection,
			allowQuantity,
			minQuantity,
			maxQuantity,
			selections,
			sortOrder,
		} = parsedInput;

		const selectionItems = parseSelections(selections);
		if (selectionItems.length === 0) {
			throw new SafeError("At least one selection is required.");
		}

		const existing = await sqlClient.storeProductOptionTemplate.findFirst({
			where: {
				id,
				storeId,
			},
			include: {
				StoreProductOptionSelectionsTemplate: false,
			},
		});

		if (!existing) {
			throw new SafeError("Option template not found");
		}

		await sqlClient.$transaction(async (tx) => {
			await tx.storeProductOptionTemplate.update({
				where: { id },
				data: {
					optionName,
					isRequired,
					isMultiple,
					minSelection,
					maxSelection,
					allowQuantity,
					minQuantity,
					maxQuantity,
					sortOrder,
				},
			});

			await tx.storeProductOptionSelectionsTemplate.deleteMany({
				where: { optionId: id },
			});

			await tx.storeProductOptionSelectionsTemplate.createMany({
				data: selectionItems.map((selection) => ({
					optionId: id,
					name: selection.name,
					price: selection.price,
					isDefault: selection.isDefault,
				})),
			});
		});

		const fullTemplate = await sqlClient.storeProductOptionTemplate.findUnique({
			where: { id },
			include: {
				StoreProductOptionSelectionsTemplate: true,
			},
		});

		if (!fullTemplate) {
			throw new SafeError("Option template not found after update");
		}

		transformDecimalsToNumbers(fullTemplate);

		return {
			template: mapProductOptionTemplateToColumn(fullTemplate),
		};
	});

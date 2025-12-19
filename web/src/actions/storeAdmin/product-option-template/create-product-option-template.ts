"use server";

import { mapProductOptionTemplateToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/product-option-template/product-option-template-column";
import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Prisma } from "@prisma/client";
import { createProductOptionTemplateSchema } from "./create-product-option-template.validation";

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

export const createProductOptionTemplateAction = storeActionClient
	.metadata({ name: "createProductOptionTemplate" })
	.schema(createProductOptionTemplateSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
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

		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		try {
			const template = await sqlClient.$transaction(async (tx) => {
				const createdTemplate = await tx.storeProductOptionTemplate.create({
					data: {
						storeId,
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

				await tx.storeProductOptionSelectionsTemplate.createMany({
					data: selectionItems.map((selection) => ({
						optionId: createdTemplate.id,
						name: selection.name,
						price: selection.price,
						isDefault: selection.isDefault,
					})),
				});

				return createdTemplate;
			});

			const fullTemplate =
				await sqlClient.storeProductOptionTemplate.findUnique({
					where: { id: template.id },
					include: {
						StoreProductOptionSelectionsTemplate: true,
					},
				});

			if (!fullTemplate) {
				throw new SafeError("Failed to create template");
			}

			// Transform Decimal objects to numbers for client components
			transformPrismaDataForJson(fullTemplate);

			return {
				template: mapProductOptionTemplateToColumn(fullTemplate),
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError(
					"Option template with the same name already exists.",
				);
			}

			throw error;
		}
	});

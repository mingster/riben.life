"use server";

import { z } from "zod";

import { sqlClient } from "@/lib/prismadb";
import { estimateCustomizationPrice } from "@/lib/product/customization-utils";
import {
	buildDefaultOptionSelections,
	computeUnitPriceBreakdown,
} from "@/lib/shop/option-selections";
import { roundMoney } from "@/lib/shop/money";
import { baseClient } from "@/utils/actions/safe-action";

import {
	addCustomizedToCartInputSchema,
	bagCustomizationClientInputSchema,
} from "./customize-product.validation";

export const saveCustomizationToCart = baseClient
	.metadata({ name: "saveCustomizationToCart" })
	.schema(
		z.object({
			productId: z.string().uuid(),
			customization: bagCustomizationClientInputSchema,
			quantity: z.number().min(1).default(1),
		}),
	)
	.action(async ({ parsedInput }) => {
		const { customization } = parsedInput;
		const customizationJson = JSON.stringify(customization);

		return {
			success: true,
			customization,
			customizationJson,
			message: "Customization saved. Add to cart to complete your order.",
		};
	});

export const addCustomizedProductToCart = baseClient
	.metadata({ name: "addCustomizedProductToCart" })
	.schema(addCustomizedToCartInputSchema)
	.action(async ({ parsedInput }) => {
		const { customization, productId, quantity } = parsedInput;

		const product = await sqlClient.product.findFirst({
			where: { id: productId, status: 1 },
			include: {
				ProductOptions: { include: { ProductOptionSelections: true } },
			},
		});

		if (!product) {
			throw new Error("Product not found or unavailable.");
		}

		const merged = buildDefaultOptionSelections(product);
		const priced = computeUnitPriceBreakdown(product, merged);
		if (priced.error) {
			throw new Error(priced.error);
		}
		const unitBeforeCustomization = priced.unit;
		const unitPrice = estimateCustomizationPrice(
			unitBeforeCustomization,
			customization,
		);
		const customizationSurcharge = roundMoney(
			unitPrice - unitBeforeCustomization,
		);
		const customizationJson = JSON.stringify(customization);

		return {
			customizationJson,
			productId,
			productName: product.name,
			storeId: product.storeId,
			quantity,
			unitPrice,
			currency: product.currency,
			priceBreakdown: {
				productBase: priced.productBase,
				optionExtra: priced.optionExtra,
				customizationSurcharge,
				unitTotal: unitPrice,
			},
		};
	});

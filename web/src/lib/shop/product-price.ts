import type { Prisma } from "@prisma/client";

import { roundMoney } from "@/lib/shop/money";
import {
	buildDefaultOptionSelections,
	computeUnitPriceFromMergedSelections,
	mergeOptionSelections,
	type ShopOptionSelectionRow,
} from "@/lib/shop/option-selections";

type ProductForPricing = Prisma.ProductGetPayload<{
	include: {
		ProductOptions: { include: { ProductOptionSelections: true } };
	};
}>;

/**
 * Display unit price in major currency units (e.g. TWD) for simple checkout validation.
 * When `useOption` is true, adds default selection surcharges (MVP).
 */
export function getProductUnitPriceNumber(product: ProductForPricing): number {
	const merged = buildDefaultOptionSelections(product);
	const { unit, error } = computeUnitPriceFromMergedSelections(product, merged);
	if (error) return roundMoney(Number(product.price));
	return unit;
}

/**
 * Unit price when the shopper chose specific option rows (e.g. PDP / cart).
 */
export function getProductUnitPriceWithSelections(
	product: ProductForPricing,
	clientRows: ShopOptionSelectionRow[] | undefined,
): number {
	const merged = mergeOptionSelections(product, clientRows);
	const { unit, error } = computeUnitPriceFromMergedSelections(product, merged);
	if (error) return getProductUnitPriceNumber(product);
	return unit;
}

export type { ShopOptionSelectionRow };

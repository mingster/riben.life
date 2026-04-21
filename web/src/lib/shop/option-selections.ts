import type { Prisma } from "@prisma/client";

import { roundMoney } from "@/lib/shop/money";

export type ProductWithOptions = Prisma.ProductGetPayload<{
	include: {
		ProductOptions: { include: { ProductOptionSelections: true } };
	};
}>;

export interface ShopOptionSelectionRow {
	optionId: string;
	selectionIds: string[];
}

/**
 * Per-option defaults: explicit defaults, or single choice when only one exists.
 */
export function buildDefaultOptionSelections(
	product: ProductWithOptions,
): ShopOptionSelectionRow[] {
	return [...product.ProductOptions]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((opt) => {
			const defaults = opt.ProductOptionSelections.filter((s) => s.isDefault);
			let selectionIds = defaults.map((s) => s.id);
			if (
				selectionIds.length === 0 &&
				opt.ProductOptionSelections.length === 1
			) {
				selectionIds = [opt.ProductOptionSelections[0].id];
			}
			return { optionId: opt.id, selectionIds };
		});
}

/**
 * Merge client payload with defaults for any option the client omitted.
 */
export function mergeOptionSelections(
	product: ProductWithOptions,
	clientRows: ShopOptionSelectionRow[] | undefined,
): ShopOptionSelectionRow[] {
	const map = new Map<string, string[]>();
	for (const r of clientRows ?? []) {
		map.set(r.optionId, [...r.selectionIds]);
	}
	return [...product.ProductOptions]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((opt) => {
			const fromClient = map.get(opt.id);
			if (fromClient !== undefined) {
				return { optionId: opt.id, selectionIds: fromClient };
			}
			const defaults = opt.ProductOptionSelections.filter((s) => s.isDefault);
			let selectionIds = defaults.map((s) => s.id);
			if (
				selectionIds.length === 0 &&
				opt.ProductOptionSelections.length === 1
			) {
				selectionIds = [opt.ProductOptionSelections[0].id];
			}
			return { optionId: opt.id, selectionIds };
		});
}

/**
 * Unit price parts for PDP / customizer / cart breakdown (base list price + option surcharges).
 */
export function computeUnitPriceBreakdown(
	product: ProductWithOptions,
	merged: ShopOptionSelectionRow[],
): {
	unit: number;
	productBase: number;
	optionExtra: number;
	error?: string;
} {
	const productBase = roundMoney(Number(product.price));
	if (!product.useOption) {
		return { unit: productBase, productBase, optionExtra: 0 };
	}

	let optionExtra = 0;
	for (const opt of [...product.ProductOptions].sort(
		(a, b) => a.sortOrder - b.sortOrder,
	)) {
		const row = merged.find((r) => r.optionId === opt.id);
		const ids = row?.selectionIds ?? [];

		if (opt.isRequired && ids.length === 0) {
			return {
				unit: 0,
				productBase,
				optionExtra: 0,
				error: `Missing required option: ${opt.optionName}`,
			};
		}

		let effectiveIds = [...ids];
		if (!opt.isMultiple && effectiveIds.length > 1) {
			effectiveIds = [effectiveIds[0]];
		}

		const maxSel =
			opt.maxSelection > 0 ? opt.maxSelection : Number.POSITIVE_INFINITY;
		if (effectiveIds.length > maxSel) {
			return {
				unit: 0,
				productBase,
				optionExtra: 0,
				error: `Too many selections for ${opt.optionName}`,
			};
		}

		const minSel =
			opt.minSelection > 0 ? opt.minSelection : opt.isRequired ? 1 : 0;
		if (effectiveIds.length < minSel) {
			return {
				unit: 0,
				productBase,
				optionExtra: 0,
				error: `Not enough selections for ${opt.optionName}`,
			};
		}

		for (const sid of effectiveIds) {
			const sel = opt.ProductOptionSelections.find((s) => s.id === sid);
			if (!sel) {
				return {
					unit: 0,
					productBase,
					optionExtra: 0,
					error: "Invalid product option selection",
				};
			}
			optionExtra += Number(sel.price);
		}
	}

	optionExtra = roundMoney(optionExtra);
	return {
		unit: roundMoney(productBase + optionExtra),
		productBase,
		optionExtra,
	};
}

export function computeUnitPriceFromMergedSelections(
	product: ProductWithOptions,
	merged: ShopOptionSelectionRow[],
): { unit: number; error?: string } {
	const r = computeUnitPriceBreakdown(product, merged);
	if (r.error) {
		return { unit: 0, error: r.error };
	}
	return { unit: r.unit };
}

/**
 * Human-readable option lines for {@link OrderItem.variants} / {@link OrderItem.variantCosts}.
 */
export function formatOptionSelectionSummary(
	product: ProductWithOptions,
	merged: ShopOptionSelectionRow[],
): { variants: string | null; variantCosts: string | null } {
	const labelParts: string[] = [];
	const costParts: string[] = [];
	for (const opt of [...product.ProductOptions].sort(
		(a, b) => a.sortOrder - b.sortOrder,
	)) {
		const row = merged.find((r) => r.optionId === opt.id);
		if (!row) {
			continue;
		}
		for (const sid of row.selectionIds) {
			const sel = opt.ProductOptionSelections.find((s) => s.id === sid);
			if (sel) {
				labelParts.push(`${opt.optionName}: ${sel.name}`);
				costParts.push(String(roundMoney(Number(sel.price))));
			}
		}
	}
	if (labelParts.length === 0) {
		return { variants: null, variantCosts: null };
	}
	return {
		variants: labelParts.join(" | "),
		variantCosts: costParts.join(","),
	};
}

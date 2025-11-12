import type { StoreProductOptionTemplate } from "@/types";

export interface ProductOptionSelectionColumn {
	id: string;
	name: string;
	price: number;
	isDefault: boolean;
}

type SelectionModel = NonNullable<
	StoreProductOptionTemplate["StoreProductOptionSelectionsTemplate"]
>[number];

export interface ProductOptionTemplateColumn {
	id: string;
	storeId: string;
	optionName: string;
	isRequired: boolean;
	isMultiple: boolean;
	minSelection: number;
	maxSelection: number;
	allowQuantity: boolean;
	minQuantity: number;
	maxQuantity: number;
	sortOrder: number;
	selections: ProductOptionSelectionColumn[];
}

export const mapProductOptionTemplateToColumn = (
	template: StoreProductOptionTemplate,
): ProductOptionTemplateColumn => {
	const selectionSource = (template.StoreProductOptionSelectionsTemplate ??
		[]) as StoreProductOptionTemplate["StoreProductOptionSelectionsTemplate"];

	const selections = selectionSource.map((selection: SelectionModel) => ({
		id: selection.id,
		name: selection.name ?? "",
		price: Number(selection.price ?? 0),
		isDefault: Boolean(selection.isDefault),
	}));

	return {
		id: template.id,
		storeId: template.storeId,
		optionName: template.optionName ?? "",
		isRequired: Boolean(template.isRequired),
		isMultiple: Boolean(template.isMultiple),
		minSelection: Number(template.minSelection ?? 0),
		maxSelection: Number(template.maxSelection ?? 0),
		allowQuantity: Boolean(template.allowQuantity),
		minQuantity: Number(template.minQuantity ?? 0),
		maxQuantity: Number(template.maxQuantity ?? 0),
		sortOrder: Number(template.sortOrder ?? 0),
		selections,
	};
};

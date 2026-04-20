import type { Prisma } from "@prisma/client";
import { format } from "date-fns";
import { epochToDate, formatDateTime } from "@/utils/datetime-utils";

function availableEndEpochToFormValue(epoch: unknown): string {
	if (epoch == null || epoch === "") {
		return "";
	}
	const n =
		typeof epoch === "bigint"
			? Number(epoch)
			: typeof epoch === "number"
				? epoch
				: null;
	if (n == null || !Number.isFinite(n)) {
		return "";
	}
	const d = new Date(n);
	if (Number.isNaN(d.getTime())) {
		return "";
	}
	return format(d, "yyyy-MM-dd'T'HH:mm");
}

export interface ProductImageColumn {
	id: string;
	url: string;
	imgPublicId: string;
	sortOrder: number;
	altText: string | null;
	mediaType: string;
}

export interface ProductOptionSelectionRow {
	id: string;
	name: string;
	price: number;
	isDefault: boolean;
	imageUrl: string | null;
}

export interface ProductOptionRow {
	id: string;
	optionName: string;
	isRequired: boolean;
	isMultiple: boolean;
	minSelection: number;
	maxSelection: number;
	allowQuantity: boolean;
	minQuantity: number;
	maxQuantity: number;
	sortOrder: number;
	selections: ProductOptionSelectionRow[];
}

export interface ProductColumn {
	id: string;
	name: string;
	description: string;
	careContent: string;
	status: number;
	price: number;
	currency: string;
	isFeatured: boolean;
	updatedAt: string;
	hasOptions: boolean;
	stock: number | undefined;
	isRecurring: boolean | undefined;
	slug: string | null;
	compareAtPrice: number | null;
	specsJsonText: string;
	attributeLength: number;
	attributeHeight: number;
	attributeWidth: number;
	attributeMfgPartNumber: string | null;
	attributeWeight: number;
	attributeStock: number;
	attributeDisplayStockAvailability: boolean;
	attributeDisplayStockQuantity: boolean;
	attributeAllowBackOrder: boolean;
	attributeOrderMinQuantity: number;
	attributeOrderMaxQuantity: number;
	attributeDisableBuyButton: boolean;
	attributeIsBrandNew: boolean;
	attributeIsShipRequired: boolean;
	attributeIsFreeShipping: boolean;
	attributeAdditionalShipCost: number;
	attributeAvailableEndDate: string;
	attributeIsCreditTopUp: boolean;
	attributeIsRecurring: boolean;
	attributeInterval: number | null;
	attributeIntervalCount: number | null;
	attributeTrialPeriodDays: number | null;
	attributeStripePriceId: string;
	/** Populated on product detail page for the edit form. */
	relatedProductIdsText?: string;
	/** Gallery rows; empty when `ProductImages` was not loaded. */
	images: ProductImageColumn[];
	/** Product options + selections; empty when not loaded on the detail query. */
	productOptions: ProductOptionRow[];
}

type ProductImageRow = {
	id: string;
	url: string;
	imgPublicId: string;
	sortOrder: number;
	altText: string | null;
	mediaType: string;
};

export type ProductWithRelations = Prisma.ProductGetPayload<{
	include: {
		ProductAttribute: true;
		ProductOptions: { include: { ProductOptionSelections: true } };
	};
}> & {
	ProductImages?: ProductImageRow[];
};

export function mapPrismaProductOptionToRow(option: {
	id: string;
	optionName: string;
	isRequired: boolean;
	isMultiple: boolean;
	minSelection: number;
	maxSelection: number;
	allowQuantity: boolean;
	minQuantity: number;
	maxQuantity: number;
	sortOrder: number;
	ProductOptionSelections?: Array<{
		id: string;
		name: string;
		price: unknown;
		isDefault: boolean;
		imageUrl: string | null;
	}>;
}): ProductOptionRow {
	const selections = option.ProductOptionSelections ?? [];
	return {
		id: option.id,
		optionName: option.optionName ?? "",
		isRequired: Boolean(option.isRequired),
		isMultiple: Boolean(option.isMultiple),
		minSelection: Number(option.minSelection ?? 0),
		maxSelection: Number(option.maxSelection ?? 0),
		allowQuantity: Boolean(option.allowQuantity),
		minQuantity: Number(option.minQuantity ?? 0),
		maxQuantity: Number(option.maxQuantity ?? 0),
		sortOrder: Number(option.sortOrder ?? 0),
		selections: selections.map((s) => ({
			id: s.id,
			name: s.name ?? "",
			price: typeof s.price === "number" ? s.price : Number(s.price ?? 0),
			isDefault: Boolean(s.isDefault),
			imageUrl: s.imageUrl ?? null,
		})),
	};
}

function specsJsonToFormText(value: unknown): string {
	if (value === null || value === undefined) {
		return "";
	}
	if (typeof value === "object" && !Array.isArray(value)) {
		return JSON.stringify(value, null, 2);
	}
	return String(value);
}

export const mapProductToColumn = (
	product: ProductWithRelations,
	options?: { relatedProductIdsText?: string },
): ProductColumn => {
	const attribute = product.ProductAttribute ?? null;
	const fallback = product as {
		isRecurring?: boolean | null;
		hasOptions?: boolean | null;
		price?: unknown;
	};

	const priceValue = fallback.price ?? product.price ?? 0;
	const recurringValue =
		attribute?.isRecurring ?? fallback.isRecurring ?? undefined;

	const compareRaw = product.compareAtPrice;
	const compareAtPrice =
		compareRaw === null || compareRaw === undefined ? null : Number(compareRaw);

	const rawImages = product.ProductImages;
	const images: ProductImageColumn[] = Array.isArray(rawImages)
		? [...rawImages]
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map((img) => ({
					id: img.id,
					url: img.url,
					imgPublicId: img.imgPublicId,
					sortOrder: img.sortOrder,
					altText: img.altText ?? null,
					mediaType: img.mediaType ?? "image",
				}))
		: [];

	return {
		id: product.id,
		name: product.name ?? "",
		description: product.description ?? "",
		careContent: product.careContent ?? "",
		status: Number(product.status ?? 0),
		price:
			typeof priceValue === "number" ? priceValue : Number(priceValue ?? 0),
		currency: product.currency ?? "twd",
		isFeatured: Boolean(product.isFeatured),
		updatedAt: formatDateTime(epochToDate(product.updatedAt) ?? new Date()),
		stock:
			attribute?.stock === undefined || attribute?.stock === null
				? undefined
				: Number(attribute.stock),
		isRecurring:
			recurringValue === undefined || recurringValue === null
				? undefined
				: Boolean(recurringValue),
		hasOptions: Array.isArray(product.ProductOptions)
			? product.ProductOptions.length > 0
			: Boolean(fallback.hasOptions),
		slug: product.slug ?? null,
		compareAtPrice,
		specsJsonText: specsJsonToFormText(product.specsJson),
		attributeLength: Number(attribute?.length ?? 0),
		attributeHeight: Number(attribute?.height ?? 0),
		attributeWidth: Number(attribute?.width ?? 0),
		attributeMfgPartNumber: attribute?.mfgPartNumber ?? null,
		attributeWeight:
			attribute?.weight === null || attribute?.weight === undefined
				? 0
				: Number(attribute.weight),
		attributeStock:
			attribute?.stock === undefined || attribute?.stock === null
				? 0
				: Number(attribute.stock),
		attributeDisplayStockAvailability: Boolean(
			attribute?.displayStockAvailability,
		),
		attributeDisplayStockQuantity: Boolean(attribute?.displayStockQuantity),
		attributeAllowBackOrder: Boolean(attribute?.allowBackOrder),
		attributeOrderMinQuantity: Number(attribute?.orderMinQuantity ?? 1),
		attributeOrderMaxQuantity: Number(attribute?.orderMaxQuantity ?? 0),
		attributeDisableBuyButton: Boolean(attribute?.disableBuyButton),
		attributeIsBrandNew: attribute?.isBrandNew !== false,
		attributeIsShipRequired: Boolean(attribute?.isShipRequired),
		attributeIsFreeShipping: Boolean(attribute?.isFreeShipping),
		attributeAdditionalShipCost:
			attribute?.additionalShipCost === null ||
			attribute?.additionalShipCost === undefined
				? 0
				: Number(attribute.additionalShipCost),
		attributeAvailableEndDate: availableEndEpochToFormValue(
			attribute?.availableEndDate,
		),
		attributeIsCreditTopUp: Boolean(attribute?.isCreditTopUp),
		attributeIsRecurring: Boolean(attribute?.isRecurring),
		attributeInterval:
			attribute?.interval === null || attribute?.interval === undefined
				? null
				: Number(attribute.interval),
		attributeIntervalCount:
			attribute?.intervalCount === null ||
			attribute?.intervalCount === undefined
				? null
				: Number(attribute.intervalCount),
		attributeTrialPeriodDays:
			attribute?.trialPeriodDays === null ||
			attribute?.trialPeriodDays === undefined
				? null
				: Number(attribute.trialPeriodDays),
		attributeStripePriceId: attribute?.stripePriceId ?? "",
		...(options?.relatedProductIdsText !== undefined
			? { relatedProductIdsText: options.relatedProductIdsText }
			: {}),
		images,
		productOptions: Array.isArray(product.ProductOptions)
			? [...product.ProductOptions]
					.sort((a, b) => a.sortOrder - b.sortOrder)
					.map(mapPrismaProductOptionToRow)
			: [],
	};
};

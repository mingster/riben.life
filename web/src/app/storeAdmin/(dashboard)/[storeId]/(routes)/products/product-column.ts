import type { Prisma } from "@prisma/client";
import { formatDateTime } from "@/utils/datetime-utils";

export interface ProductColumn {
	id: string;
	name: string;
	status: number;
	price: number;
	isFeatured: boolean;
	updatedAt: string;
	hasOptions: boolean;
	stock: number | undefined;
	isRecurring: boolean | undefined;
}

export type ProductWithRelations = Prisma.ProductGetPayload<{
	include: {
		ProductAttribute: true;
		ProductOptions: true;
	};
}>;

export const mapProductToColumn = (
	product: ProductWithRelations,
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

	return {
		id: product.id,
		name: product.name ?? "",
		status: Number(product.status ?? 0),
		price:
			typeof priceValue === "number" ? priceValue : Number(priceValue ?? 0),
		isFeatured: Boolean(product.isFeatured),
		updatedAt: formatDateTime(product.updatedAt ?? new Date()),
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
	};
};

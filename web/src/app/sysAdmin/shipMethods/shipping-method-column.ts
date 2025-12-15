import type { ShippingMethod } from "@prisma/client";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";

export interface ShippingMethodColumn {
	id: string;
	name: string;
	identifier: string;
	description: string | null;
	basic_price: number;
	currencyId: string;
	isDefault: boolean;
	isDeleted: boolean;
	shipRequired: boolean;
	updatedAt: string;
	updatedAtIso: string;
	createdAt: string;
	createdAtIso: string;
	stores: number;
	StoreOrder: number;
	Shipment: number;
	canDelete: boolean;
}

export const mapShippingMethodToColumn = (
	shippingMethod: ShippingMethod & {
		_count?: {
			stores?: number;
			StoreOrder?: number;
			Shipment?: number;
		};
	},
): ShippingMethodColumn => ({
	id: shippingMethod.id,
	name: shippingMethod.name ?? "",
	identifier: shippingMethod.identifier ?? "",
	description: shippingMethod.description,
	basic_price: Number(shippingMethod.basic_price) || 0,
	currencyId: shippingMethod.currencyId ?? "twd",
	isDefault: shippingMethod.isDefault,
	isDeleted: shippingMethod.isDeleted,
	shipRequired: shippingMethod.shipRequired,
	updatedAt: formatDateTime(
		epochToDate(shippingMethod.updatedAt) ?? new Date(),
	),
	createdAt: formatDateTime(
		epochToDate(shippingMethod.createdAt) ?? new Date(),
	),
	updatedAtIso:
		epochToDate(shippingMethod.updatedAt)?.toISOString() ??
		new Date().toISOString(),
	createdAtIso:
		epochToDate(shippingMethod.createdAt)?.toISOString() ??
		new Date().toISOString(),
	stores: shippingMethod._count?.stores ?? 0,
	StoreOrder: shippingMethod._count?.StoreOrder ?? 0,
	Shipment: shippingMethod._count?.Shipment ?? 0,
	canDelete: shippingMethod.canDelete ?? false,
});

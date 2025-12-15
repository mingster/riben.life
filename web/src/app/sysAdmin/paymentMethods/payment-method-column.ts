import type { PaymentMethod } from "@prisma/client";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";

export interface PaymentMethodColumn {
	id: string;
	name: string;
	payUrl: string;
	priceDescr: string;
	fee: number;
	feeAdditional: number;
	clearDays: number;
	isDefault: boolean;
	isDeleted: boolean;
	updatedAt: string;
	updatedAtIso: string;
	createdAt: string;
	createdAtIso: string;
	StorePaymentMethodMapping: number;
	StoreOrder: number;
	canDelete: boolean;
}

export const mapPaymentMethodToColumn = (
	paymentMethod: PaymentMethod & {
		_count?: {
			StorePaymentMethodMapping?: number;
			StoreOrder?: number;
		};
	},
): PaymentMethodColumn => ({
	id: paymentMethod.id,
	name: paymentMethod.name ?? "",
	payUrl: paymentMethod.payUrl ?? "",
	priceDescr: paymentMethod.priceDescr ?? "",
	fee: Number(paymentMethod.fee) || 0,
	feeAdditional: Number(paymentMethod.feeAdditional) || 0,
	clearDays: paymentMethod.clearDays,
	isDefault: paymentMethod.isDefault,
	isDeleted: paymentMethod.isDeleted,
	updatedAt: formatDateTime(epochToDate(paymentMethod.updatedAt) ?? new Date()),
	createdAt: formatDateTime(epochToDate(paymentMethod.createdAt) ?? new Date()),
	updatedAtIso:
		epochToDate(paymentMethod.updatedAt)?.toISOString() ??
		new Date().toISOString(),
	createdAtIso:
		epochToDate(paymentMethod.createdAt)?.toISOString() ??
		new Date().toISOString(),
	StorePaymentMethodMapping:
		paymentMethod._count?.StorePaymentMethodMapping ?? 0,
	StoreOrder: paymentMethod._count?.StoreOrder ?? 0,
	canDelete: paymentMethod.canDelete ?? false,
});

import type { StoreLedger } from "@prisma/client";
import { formatDateTime, epochToDate } from "@/utils/datetime-utils";

export interface BalanceColumn {
	id: string;
	storeId: string;
	orderId: string | null;
	amount: number;
	fee: number;
	platformFee: number;
	currency: string;
	balance: number;
	description: string | null;
	note: string | null;
	createdAt: string;
	availability: string;
	createdAtIso: string;
	availabilityIso: string;
}

export const mapStoreLedgerToColumn = (
	ledger: StoreLedger,
	storeId: string,
): BalanceColumn => ({
	id: ledger.id,
	storeId,
	orderId: ledger.orderId ?? null,
	amount: Number(ledger.amount ?? 0),
	fee: Number(ledger.fee ?? 0),
	platformFee: Number(ledger.platformFee ?? 0),
	currency: ledger.currency ?? "",
	balance: Number(ledger.balance ?? 0),
	description: ledger.description ?? null,
	note: ledger.note ?? null,
	createdAt: formatDateTime(epochToDate(ledger.createdAt) ?? new Date()),
	availability: formatDateTime(epochToDate(ledger.availability) ?? new Date()),
	createdAtIso:
		epochToDate(ledger.createdAt)?.toISOString() ?? new Date().toISOString(),
	availabilityIso:
		epochToDate(ledger.availability)?.toISOString() ?? new Date().toISOString(),
});

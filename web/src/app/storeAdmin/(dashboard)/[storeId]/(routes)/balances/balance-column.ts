import type { StoreLedger } from "@prisma/client";
import { formatDateTime } from "@/utils/datetime-utils";

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
	createdAt: formatDateTime(ledger.createdAt),
	availability: formatDateTime(ledger.availability),
	createdAtIso: ledger.createdAt.toISOString(),
	availabilityIso: ledger.availability.toISOString(),
});

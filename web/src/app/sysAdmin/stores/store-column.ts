import { subscriptionStatusToLabel } from "@/app/sysAdmin/subscriptions/subscription-row";

/** Store billing subscription summary for sysAdmin lists (JSON-serializable). */
export interface SysAdminStoreSubscriptionInfo {
	id: string;
	status: number;
	statusLabel: string;
	expiration: number;
	billingProvider: string;
	subscriptionId: string | null;
	updatedAt: number;
}

export interface SysAdminStoreRow {
	id: string;
	name: string;
	ownerId: string;
	defaultCurrency: string;
	defaultCountry: string;
	defaultLocale: string;
	updatedAt: number;
	isDeleted: boolean;
	isOpen: boolean;
	acceptAnonymousOrder: boolean;
	autoAcceptOrder: boolean;
	Organization: {
		id: string;
		name: string;
		slug: string;
	};
	subscription: SysAdminStoreSubscriptionInfo | null;
}

/** Prisma or action payload may still type `updatedAt` as bigint until normalized. */
export type SysAdminStoreRowSource = Omit<
	SysAdminStoreRow,
	"updatedAt" | "subscription"
> & {
	updatedAt: number | bigint;
};

export function prismaStoreSubscriptionToInfo(sub: {
	id: string;
	status: number;
	expiration: number | bigint;
	billingProvider: string;
	subscriptionId: string | null;
	updatedAt: number | bigint;
}): SysAdminStoreSubscriptionInfo {
	return {
		id: sub.id,
		status: sub.status,
		statusLabel: subscriptionStatusToLabel(sub.status),
		expiration:
			typeof sub.expiration === "bigint"
				? Number(sub.expiration)
				: sub.expiration,
		billingProvider: sub.billingProvider,
		subscriptionId: sub.subscriptionId,
		updatedAt:
			typeof sub.updatedAt === "bigint" ? Number(sub.updatedAt) : sub.updatedAt,
	};
}

export function toSysAdminStoreRow(
	row: SysAdminStoreRowSource,
	subscription: SysAdminStoreSubscriptionInfo | null = null,
): SysAdminStoreRow {
	return {
		...row,
		updatedAt:
			typeof row.updatedAt === "bigint" ? Number(row.updatedAt) : row.updatedAt,
		subscription,
	};
}

export interface SysAdminOrganizationOption {
	id: string;
	name: string;
	slug: string;
}

export interface SysAdminUserOption {
	id: string;
	name: string | null;
	email: string | null;
}

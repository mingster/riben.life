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
}

/** Prisma or action payload may still type `updatedAt` as bigint until normalized. */
export type SysAdminStoreRowSource = Omit<SysAdminStoreRow, "updatedAt"> & {
	updatedAt: number | bigint;
};

export function toSysAdminStoreRow(
	row: SysAdminStoreRowSource,
): SysAdminStoreRow {
	return {
		...row,
		updatedAt:
			typeof row.updatedAt === "bigint" ? Number(row.updatedAt) : row.updatedAt,
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

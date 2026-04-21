export interface SysAdminOrganizationRow {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	metadata: string | null;
	createdAt: string;
	storeCount: number;
}

export function toSysAdminOrganizationRow(row: {
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	metadata: string | null;
	createdAt: Date | string;
	_count: { stores: number };
}): SysAdminOrganizationRow {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		logo: row.logo,
		metadata: row.metadata,
		createdAt:
			typeof row.createdAt === "string"
				? row.createdAt
				: row.createdAt.toISOString(),
		storeCount: row._count.stores,
	};
}

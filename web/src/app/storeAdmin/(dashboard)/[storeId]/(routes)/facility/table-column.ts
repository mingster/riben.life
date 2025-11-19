import type { StoreFacility } from "@prisma/client";

export interface TableColumn {
	id: string;
	storeId: string;
	facilityName: string;
	capacity: number;
	defaultCost: number;
	defaultCredit: number;
	defaultDuration: number;
}

export const mapFacilityToColumn = (facility: StoreFacility): TableColumn => ({
	id: facility.id,
	storeId: facility.storeId,
	facilityName: facility.facilityName,
	capacity: facility.capacity,
	defaultCost: facility.defaultCost.toNumber(),
	defaultCredit: facility.defaultCredit.toNumber(),
	defaultDuration: facility.defaultDuration,
});

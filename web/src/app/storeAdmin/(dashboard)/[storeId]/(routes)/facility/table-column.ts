import type { StoreFacility } from "@prisma/client";

export interface TableColumn {
	id: string;
	storeId: string;
	facilityName: string;
	capacity: number;
	defaultCost: number;
	defaultCredit: number;
	defaultDuration: number;
	businessHours: string | null;
	description: string | null;
	location: string | null;
	travelInfo: string | null;
}

export const mapFacilityToColumn = (
	facility: StoreFacility | TableColumn,
): TableColumn => {
	// Handle both Prisma Decimal objects and already-transformed numbers
	const defaultCost =
		typeof facility.defaultCost === "number"
			? facility.defaultCost
			: facility.defaultCost.toNumber();
	const defaultCredit =
		typeof facility.defaultCredit === "number"
			? facility.defaultCredit
			: facility.defaultCredit.toNumber();

	return {
		id: facility.id,
		storeId: facility.storeId,
		facilityName: facility.facilityName,
		capacity: facility.capacity,
		defaultCost,
		defaultCredit,
		defaultDuration: facility.defaultDuration,
		businessHours: facility.businessHours,
		description: facility.description,
		location: facility.location,
		travelInfo: facility.travelInfo,
	};
};

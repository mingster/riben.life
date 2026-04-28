import type { Prisma } from "@prisma/client";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type {
	ReserveWithGoogleFeedInput,
	ReserveWithGoogleFeedPayload,
} from "./types";

function decimalToMinor(
	value: Prisma.Decimal | null,
	fallback: number,
): number {
	if (!value) {
		return fallback;
	}
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) {
		return fallback;
	}
	return Math.max(0, Math.round(numeric * 100));
}

export function buildReserveWithGoogleFeedPayload(
	input: ReserveWithGoogleFeedInput,
): ReserveWithGoogleFeedPayload {
	const services: ReserveWithGoogleFeedPayload["services"] = [];

	if (input.rsvpSettings.rsvpMode === 0) {
		for (const facility of input.facilities) {
			services.push({
				id: facility.id,
				type: "facility",
				name: facility.facilityName,
				durationMinutes: facility.defaultDuration ?? 60,
				priceMinor: decimalToMinor(facility.defaultCost, 0),
				creditPriceMinor: decimalToMinor(facility.defaultCredit, 0),
			});
		}
	} else if (input.rsvpSettings.rsvpMode === 1) {
		for (const serviceStaff of input.serviceStaffs) {
			const serviceStaffLabel = [
				serviceStaff.displayName,
				serviceStaff.serviceStaffName,
			]
				.filter(
					(value): value is string =>
						typeof value === "string" && value.trim().length > 0,
				)
				.at(0);
			services.push({
				id: serviceStaff.id,
				type: "service_staff",
				name: serviceStaffLabel ?? "Service",
				durationMinutes: 60,
				priceMinor: 0,
				creditPriceMinor: 0,
			});
		}
	} else {
		services.push({
			id: input.store.id,
			type: "store",
			name: input.store.name,
			durationMinutes: 60,
			priceMinor: 0,
			creditPriceMinor: 0,
		});
	}

	return {
		metadata: {
			storeId: input.store.id,
			storeName: input.store.name,
			environment: input.environment,
			generatedAt: getUtcNowEpoch(),
		},
		entity: {
			storeId: input.store.id,
			name: input.store.name,
			address: {
				streetLine1: input.storeSettings.streetLine1 || "",
				streetLine2: input.storeSettings.streetLine2 || "",
				city: input.storeSettings.city || "",
				district: input.storeSettings.district || "",
				province: input.storeSettings.province || "",
				postalCode: input.storeSettings.postalCode || "",
				country: input.storeSettings.country || "",
			},
			phoneNumber: input.storeSettings.phoneNumber || "",
			timezone: input.store.defaultTimezone,
		},
		actions: input.actionLinks,
		services,
		rules: {
			rsvpMode: input.rsvpSettings.rsvpMode,
			acceptReservation: input.rsvpSettings.acceptReservation,
			canReserveBeforeMinutes: input.rsvpSettings.canReserveBefore,
			canReserveAfterHours: input.rsvpSettings.canReserveAfter,
			useBusinessHours: input.rsvpSettings.useBusinessHours,
		},
	};
}

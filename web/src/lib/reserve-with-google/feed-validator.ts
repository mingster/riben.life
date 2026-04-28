import type {
	ReserveWithGoogleFeedPayload,
	ReserveWithGoogleFeedValidationResult,
} from "./types";

export function validateReserveWithGoogleFeedPayload(
	payload: ReserveWithGoogleFeedPayload,
): ReserveWithGoogleFeedValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!payload.entity.address.streetLine1) {
		errors.push("Missing address streetLine1.");
	}
	if (!payload.entity.address.city) {
		errors.push("Missing address city.");
	}
	if (!payload.entity.address.country) {
		errors.push("Missing address country.");
	}
	if (!payload.entity.phoneNumber) {
		errors.push("Missing store phone number.");
	}
	if (!payload.entity.timezone) {
		errors.push("Missing store timezone.");
	}
	if (!payload.actions.storeReservationUrl.startsWith("http")) {
		errors.push("Store action link must be absolute.");
	}
	if (payload.services.length === 0) {
		errors.push("Feed must include at least one service.");
	}

	for (const service of payload.services) {
		if (!service.name) {
			errors.push(`Service ${service.id} is missing a name.`);
		}
		if (service.durationMinutes <= 0) {
			errors.push(`Service ${service.id} has invalid duration.`);
		}
		if (service.priceMinor < 0 || service.creditPriceMinor < 0) {
			errors.push(`Service ${service.id} has invalid pricing.`);
		}
	}

	if (!payload.rules.acceptReservation) {
		warnings.push("Store is currently not accepting reservations.");
	}
	if (payload.rules.canReserveAfterHours < 24) {
		warnings.push("Reservation window is very short for Google discovery.");
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

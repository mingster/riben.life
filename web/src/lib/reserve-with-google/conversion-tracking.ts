import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type { ReserveWithGoogleConversionEventInput } from "./types";

function buildIdempotencyKey(
	input: ReserveWithGoogleConversionEventInput,
): string {
	return [
		input.rsvpId,
		input.externalTrackingId || "no-tracking-id",
		input.eventType,
	].join(":");
}

function shouldTrackConversion(
	input: ReserveWithGoogleConversionEventInput,
): boolean {
	return (
		input.source === "reserve_with_google" ||
		input.externalSource === "google_actions_center"
	);
}

export async function trackReserveWithGoogleConversionEvent(
	input: ReserveWithGoogleConversionEventInput,
): Promise<void> {
	if (!shouldTrackConversion(input)) {
		return;
	}

	const idempotencyKey = buildIdempotencyKey(input);
	const now = getUtcNowEpoch();

	await sqlClient.reserveWithGoogleConversionEvent.upsert({
		where: { idempotencyKey },
		update: {
			source: input.source,
			externalTrackingId: input.externalTrackingId,
			payload: {
				rsvpId: input.rsvpId,
				storeId: input.storeId,
				eventType: input.eventType,
				source: input.source,
				externalSource: input.externalSource || null,
				externalTrackingId: input.externalTrackingId,
			},
			updatedAt: now,
		},
		create: {
			storeId: input.storeId,
			rsvpId: input.rsvpId,
			eventType: input.eventType,
			source: input.source,
			externalTrackingId: input.externalTrackingId,
			idempotencyKey,
			payload: {
				rsvpId: input.rsvpId,
				storeId: input.storeId,
				eventType: input.eventType,
				source: input.source,
				externalSource: input.externalSource || null,
				externalTrackingId: input.externalTrackingId,
			},
			createdAt: now,
			updatedAt: now,
		},
	});

	logger.info("Reserve with Google conversion tracked", {
		metadata: {
			idempotencyKey,
			rsvpId: input.rsvpId,
			storeId: input.storeId,
			eventType: input.eventType,
		},
		tags: ["reserve-with-google", "conversion"],
	});
}

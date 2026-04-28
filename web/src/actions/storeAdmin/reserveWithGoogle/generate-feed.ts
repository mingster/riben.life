"use server";

import {
	buildReserveWithGoogleActionLinks,
	buildReserveWithGoogleFeedPayload,
	checkReserveWithGoogleEligibility,
	validateReserveWithGoogleFeedPayload,
} from "@/lib/reserve-with-google";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { generateReserveWithGoogleFeedSchema } from "./generate-feed.validation";

export async function generateReserveWithGoogleFeedData(input: {
	storeId: string;
	environment: "sandbox" | "production";
	externalTrackingId?: string;
}) {
	const eligibility = await checkReserveWithGoogleEligibility(input.storeId);
	if (!eligibility.isEligible) {
		throw new SafeError(
			"Store is not eligible for Reserve with Google feed generation.",
		);
	}

	const store = await sqlClient.store.findUnique({
		where: { id: input.storeId },
		include: {
			StoreSettings: true,
			rsvpSettings: true,
			StoreFacilities: true,
			ServiceStaffs: {
				where: { isDeleted: false },
				include: {
					User: { select: { name: true, email: true } },
				},
			},
		},
	});

	if (!store || !store.StoreSettings || !store.rsvpSettings) {
		throw new SafeError(
			"Missing store settings for Reserve with Google feed generation.",
		);
	}

	const actionLinks = buildReserveWithGoogleActionLinks({
		context: {
			store: {
				id: store.id,
				customDomain: store.customDomain,
			},
			source: "reserve_with_google",
			utmSource: "google",
			utmMedium: "organic",
			utmCampaign: "reserve_with_google",
			externalTrackingId: input.externalTrackingId,
		},
		facilities: store.StoreFacilities.map((facility) => ({ id: facility.id })),
		serviceStaffs: store.ServiceStaffs.map((serviceStaff) => ({
			id: serviceStaff.id,
		})),
	});

	const payload = buildReserveWithGoogleFeedPayload({
		store: {
			id: store.id,
			name: store.name,
			defaultTimezone: store.defaultTimezone,
			customDomain: store.customDomain,
		},
		storeSettings: {
			streetLine1: store.StoreSettings.streetLine1,
			streetLine2: store.StoreSettings.streetLine2,
			city: store.StoreSettings.city,
			district: store.StoreSettings.district,
			province: store.StoreSettings.province,
			postalCode: store.StoreSettings.postalCode,
			country: store.StoreSettings.country,
			phoneNumber: store.StoreSettings.phoneNumber,
		},
		rsvpSettings: {
			acceptReservation: store.rsvpSettings.acceptReservation,
			rsvpMode: store.rsvpSettings.rsvpMode,
			maxCapacity: store.rsvpSettings.maxCapacity,
			useBusinessHours: store.rsvpSettings.useBusinessHours,
			rsvpHours: store.rsvpSettings.rsvpHours,
			canReserveBefore: store.rsvpSettings.canReserveBefore,
			canReserveAfter: store.rsvpSettings.canReserveAfter,
			reserveWithGoogleEnabled: store.rsvpSettings.reserveWithGoogleEnabled,
		},
		facilities: store.StoreFacilities.map((facility) => ({
			id: facility.id,
			facilityName: facility.facilityName,
			defaultDuration: facility.defaultDuration,
			defaultCost: facility.defaultCost,
			defaultCredit: facility.defaultCredit,
		})),
		serviceStaffs: store.ServiceStaffs.map((serviceStaff) => ({
			id: serviceStaff.id,
			displayName: serviceStaff.User?.name ?? null,
			serviceStaffName:
				serviceStaff.description ?? serviceStaff.User?.name ?? null,
		})),
		actionLinks,
		environment: input.environment,
	});

	const validation = validateReserveWithGoogleFeedPayload(payload);
	const now = getUtcNowEpoch();

	const feedRun = await sqlClient.reserveWithGoogleFeedRun.create({
		data: {
			storeId: input.storeId,
			environment: input.environment,
			feedType: "full",
			status: validation.isValid ? "validated" : "error",
			generatedAt: payload.metadata.generatedAt,
			error: validation.errors.length > 0 ? validation.errors.join("; ") : null,
			createdAt: now,
			updatedAt: now,
		},
	});

	return {
		feedRun,
		payload,
		validation,
	};
}

export const generateReserveWithGoogleFeedAction = storeActionClient
	.metadata({ name: "generateReserveWithGoogleFeed" })
	.schema(generateReserveWithGoogleFeedSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		return generateReserveWithGoogleFeedData({
			storeId,
			environment: parsedInput.environment,
			externalTrackingId: parsedInput.externalTrackingId,
		});
	});

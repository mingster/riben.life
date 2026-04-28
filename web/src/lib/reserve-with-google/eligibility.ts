import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import type {
	ReserveWithGoogleEligibilityIssue,
	ReserveWithGoogleEligibilityResult,
} from "./types";

function issue(
	key: string,
	label: string,
	message: string,
	severity: "error" | "warning" = "error",
): ReserveWithGoogleEligibilityIssue {
	return { key, label, message, severity };
}

export async function checkReserveWithGoogleEligibility(
	storeId: string,
): Promise<ReserveWithGoogleEligibilityResult> {
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		include: {
			StoreSettings: true,
			rsvpSettings: true,
			StoreFacilities: true,
			ServiceStaffs: {
				where: { isDeleted: false },
			},
		},
	});

	if (!store) {
		return {
			isEligible: false,
			checkedAt: getUtcNowEpoch(),
			issues: [issue("store", "Store", "Store not found.")],
		};
	}

	const issues: ReserveWithGoogleEligibilityIssue[] = [];
	const settings = store.StoreSettings;
	const rsvpSettings = store.rsvpSettings;

	if (!settings) {
		issues.push(
			issue(
				"store_settings",
				"Store Settings",
				"Store settings are required before enabling Reserve with Google.",
			),
		);
	}

	if (!rsvpSettings) {
		issues.push(
			issue(
				"rsvp_settings",
				"RSVP Settings",
				"RSVP settings are required before enabling Reserve with Google.",
			),
		);
	}

	if (!store.defaultTimezone) {
		issues.push(
			issue(
				"timezone",
				"Timezone",
				"A store timezone is required for Actions Center feeds.",
			),
		);
	}

	if (rsvpSettings && !rsvpSettings.acceptReservation) {
		issues.push(
			issue(
				"accept_reservation",
				"Accept Reservation",
				"Store must accept reservations to be eligible for Reserve with Google.",
			),
		);
	}

	if (settings) {
		const missingAddressParts: string[] = [];
		if (!settings.streetLine1?.trim()) missingAddressParts.push("streetLine1");
		if (!settings.city?.trim()) missingAddressParts.push("city");
		if (!settings.province?.trim()) missingAddressParts.push("province");
		if (!settings.country?.trim()) missingAddressParts.push("country");
		if (!settings.postalCode?.trim()) missingAddressParts.push("postalCode");
		if (!settings.phoneNumber?.trim()) missingAddressParts.push("phoneNumber");

		if (missingAddressParts.length > 0) {
			issues.push(
				issue(
					"location_profile",
					"Physical Location",
					`Store is missing required location fields: ${missingAddressParts.join(", ")}.`,
				),
			);
		}
	}

	const hasModeCoverage =
		store.StoreFacilities.length > 0 ||
		store.ServiceStaffs.length > 0 ||
		(rsvpSettings?.rsvpMode ?? 0) === 2;
	if (!hasModeCoverage) {
		issues.push(
			issue(
				"service_coverage",
				"Bookable Coverage",
				"At least one active facility or service staff is required unless restaurant mode is enabled.",
			),
		);
	}

	if (!store.customDomain) {
		issues.push(
			issue(
				"merchant_url",
				"Merchant Booking URL",
				"Custom domain is recommended for stable merchant-specific action links.",
				"warning",
			),
		);
	}

	if (issues.length > 0) {
		logger.warn("Reserve with Google eligibility check has issues", {
			metadata: {
				storeId,
				issues,
			},
			tags: ["reserve-with-google", "eligibility"],
		});
	}

	const hasErrors = issues.some((item) => item.severity === "error");
	return {
		isEligible: !hasErrors,
		checkedAt: getUtcNowEpoch(),
		issues,
	};
}

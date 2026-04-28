import type { ServiceStaff, StoreFacility } from "@prisma/client";
import type {
	ReserveWithGoogleActionLinkContext,
	ReserveWithGoogleActionLinkSet,
} from "./types";

function resolveBaseUrl(storeCustomDomain: string | null): string {
	if (storeCustomDomain?.trim()) {
		return `https://${storeCustomDomain.trim()}`;
	}
	return (
		process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
		process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
		"https://riben.life"
	);
}

function appendTrackingParams(
	pathname: string,
	context: ReserveWithGoogleActionLinkContext,
): string {
	const params = new URLSearchParams({
		utm_source: context.utmSource,
		utm_medium: context.utmMedium,
		utm_campaign: context.utmCampaign,
		source: context.source,
	});
	if (context.externalTrackingId) {
		params.set("external_tracking_id", context.externalTrackingId);
	}
	return `${pathname}?${params.toString()}`;
}

export function buildReserveWithGoogleActionLinks(input: {
	context: ReserveWithGoogleActionLinkContext;
	facilities: Array<Pick<StoreFacility, "id">>;
	serviceStaffs: Array<Pick<ServiceStaff, "id">>;
}): ReserveWithGoogleActionLinkSet {
	const baseUrl = resolveBaseUrl(input.context.store.customDomain);
	const storePath = `/s/${input.context.store.id}/reservation`;

	const facilityReservationUrls: Record<string, string> = {};
	for (const facility of input.facilities) {
		facilityReservationUrls[facility.id] = `${baseUrl}${appendTrackingParams(
			`${storePath}/${facility.id}`,
			input.context,
		)}`;
	}

	const serviceStaffReservationUrls: Record<string, string> = {};
	for (const serviceStaff of input.serviceStaffs) {
		serviceStaffReservationUrls[serviceStaff.id] =
			`${baseUrl}${appendTrackingParams(
				`${storePath}/service-staff/${serviceStaff.id}`,
				input.context,
			)}`;
	}

	return {
		storeReservationUrl: `${baseUrl}${appendTrackingParams(
			storePath,
			input.context,
		)}`,
		facilityReservationUrls,
		serviceStaffReservationUrls,
	};
}

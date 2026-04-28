import type {
	ReserveWithGoogleFeedRun,
	RsvpSettings,
	Store,
	StoreFacility,
	StoreSettings,
} from "@prisma/client";

export interface ReserveWithGoogleEligibilityIssue {
	key: string;
	label: string;
	message: string;
	severity: "error" | "warning";
}

export interface ReserveWithGoogleEligibilityResult {
	isEligible: boolean;
	checkedAt: bigint;
	issues: ReserveWithGoogleEligibilityIssue[];
}

export interface ReserveWithGoogleActionLinkContext {
	store: Pick<Store, "id" | "customDomain">;
	source: string;
	utmSource: string;
	utmMedium: string;
	utmCampaign: string;
	externalTrackingId?: string;
}

export interface ReserveWithGoogleActionLinkSet {
	storeReservationUrl: string;
	facilityReservationUrls: Record<string, string>;
	serviceStaffReservationUrls: Record<string, string>;
}

export interface ReserveWithGoogleFeedInput {
	store: Pick<Store, "id" | "name" | "defaultTimezone" | "customDomain">;
	storeSettings: Pick<
		StoreSettings,
		| "streetLine1"
		| "streetLine2"
		| "city"
		| "district"
		| "province"
		| "postalCode"
		| "country"
		| "phoneNumber"
	>;
	rsvpSettings: Pick<
		RsvpSettings,
		| "acceptReservation"
		| "rsvpMode"
		| "maxCapacity"
		| "useBusinessHours"
		| "rsvpHours"
		| "canReserveBefore"
		| "canReserveAfter"
		| "reserveWithGoogleEnabled"
	>;
	facilities: Array<
		Pick<
			StoreFacility,
			| "id"
			| "facilityName"
			| "defaultDuration"
			| "defaultCost"
			| "defaultCredit"
		>
	>;
	/** `displayName` / `serviceStaffName` are feed-facing labels (e.g. from staff User, not Prisma fields). */
	serviceStaffs: Array<{
		id: string;
		displayName: string | null;
		serviceStaffName: string | null;
	}>;
	actionLinks: ReserveWithGoogleActionLinkSet;
	environment: "sandbox" | "production";
}

export interface ReserveWithGoogleFeedPayload {
	metadata: {
		storeId: string;
		storeName: string;
		environment: "sandbox" | "production";
		generatedAt: bigint;
	};
	entity: {
		storeId: string;
		name: string;
		address: {
			streetLine1: string;
			streetLine2: string;
			city: string;
			district: string;
			province: string;
			postalCode: string;
			country: string;
		};
		phoneNumber: string;
		timezone: string;
	};
	actions: ReserveWithGoogleActionLinkSet;
	services: Array<{
		id: string;
		type: "facility" | "service_staff" | "store";
		name: string;
		durationMinutes: number;
		priceMinor: number;
		creditPriceMinor: number;
	}>;
	rules: {
		rsvpMode: number;
		acceptReservation: boolean;
		canReserveBeforeMinutes: number;
		canReserveAfterHours: number;
		useBusinessHours: boolean;
	};
}

export interface ReserveWithGoogleFeedValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export interface ReserveWithGoogleSubmitFeedInput {
	environment: "sandbox" | "production";
	payload: ReserveWithGoogleFeedPayload;
}

export interface ReserveWithGoogleSubmitFeedResult {
	status: "submitted" | "exported";
	submittedAt: bigint;
	artifactPath?: string;
}

export interface ReserveWithGoogleFeedRunResult {
	feedRun: ReserveWithGoogleFeedRun;
	validation: ReserveWithGoogleFeedValidationResult;
}

export interface ReserveWithGoogleConversionEventInput {
	rsvpId: string;
	storeId: string;
	eventType: "created" | "confirmed";
	source: string | null;
	/** e.g. `google_actions_center` for partner attribution. */
	externalSource?: string | null;
	externalTrackingId: string | null;
}

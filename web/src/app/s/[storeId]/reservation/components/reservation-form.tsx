"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconCalendarCheck,
	IconCalendar,
	IconClock,
} from "@tabler/icons-react";
import { format, type Locale } from "date-fns";
import { zhTW } from "date-fns/locale/zh-TW";
import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";

import { createReservationAction } from "@/actions/store/reservation/create-reservation";
import {
	createReservationSchema,
	type CreateReservationInput,
} from "@/actions/store/reservation/create-reservation.validation";
import { updateReservationAction } from "@/actions/store/reservation/update-reservation";
import {
	updateReservationSchema,
	type UpdateReservationInput,
} from "@/actions/store/reservation/update-reservation.validation";
import { getServiceStaffAction } from "@/actions/store/reservation/get-service-staff";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { useTranslation } from "@/app/i18n/client";
import { FacilityCombobox } from "@/components/combobox-facility";
import { ServiceStaffCombobox } from "@/components/combobox-service-staff";
import { toastError, toastSuccess, toastWarning } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";

import {
	dateToEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
	getUtcNow,
} from "@/utils/datetime-utils";
import {
	checkTimeAgainstBusinessHours,
	rsvpTimeToEpoch,
	transformReservationForStorage,
} from "@/utils/rsvp-utils";
import { RsvpStatus } from "@/types/enum";
import { SlotPicker } from "./slot-picker";
import { Separator } from "@/components/ui/separator";
import { calculateCancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";
import { RsvpCancelPolicyInfo } from "@/components/rsvp-cancel-policy-info";
import { clientLogger } from "@/lib/client-logger";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { PhoneCountryCodeSelector } from "@/components/auth/phone-country-code-selector";
import { authClient } from "@/lib/auth-client";

interface ReservationFormProps {
	storeId: string;
	rsvpSettings: (RsvpSettings & { defaultCost?: number | null }) | null;
	storeSettings?: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	// Create mode props
	defaultRsvpTime?: Date;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	// Edit mode props
	rsvp?: Rsvp;
	existingReservations?: Rsvp[]; // Existing reservations to check for conflicts
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
	// Common props
	hideCard?: boolean;
	storeTimezone?: string;
	storeCurrency?: string;
	storeUseBusinessHours?: boolean | null;
	// Store credit info
	useCustomerCredit?: boolean;
	creditExchangeRate?: number | null;
	creditServiceExchangeRate?: number | null;
}

// * Implements **UC-RSVP-001:**, et al from FUNCTIONAL-REQUIREMENTS-CREDIT.md
// allow anonymous or signed-in customers to create reservations
//
export function ReservationForm({
	storeId,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	defaultRsvpTime,
	onReservationCreated,
	rsvp,
	existingReservations = [],
	onReservationUpdated,
	hideCard = false,
	storeTimezone = "Asia/Taipei",
	storeCurrency = "twd",
	storeUseBusinessHours,
	useCustomerCredit = false,
	creditExchangeRate = null,
	creditServiceExchangeRate = null,
}: ReservationFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Helper function to check if user is anonymous (guest user)
	const isAnonymousUser = useMemo(() => {
		if (!user) return true; // No user = anonymous
		// Check if user email matches guest pattern (guest-{id}@riben.life)
		return (
			user.email &&
			user.email.startsWith("guest-") &&
			user.email.endsWith("@riben.life")
		);
	}, [user]);
	// Initialize phoneCountryCode from localStorage (same keys as FormPhoneOtpInner)
	// This ensures PhoneCountryCodeSelector shows the correct country code on mount
	const [phoneCountryCode, setPhoneCountryCode] = useState<string>(() => {
		if (typeof window !== "undefined") {
			const savedCountryCode = localStorage.getItem("phone_country_code");
			if (
				savedCountryCode &&
				(savedCountryCode === "+1" || savedCountryCode === "+886")
			) {
				return savedCountryCode;
			}
		}
		return "+886"; // Default to Taiwan
	});
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Map i18n language codes to date-fns locales
	const dateLocale = useMemo((): Locale => {
		const localeMap: Record<string, Locale> = {
			tw: zhTW,
			en: enUS,
			jp: ja,
		};
		return localeMap[lng || "tw"] || zhTW;
	}, [lng]);

	// Initialize saved contact info from localStorage (only for anonymous users)
	// Phone number is loaded separately in defaultValues using same keys as FormPhoneOtpInner
	const [savedContactInfo, setSavedContactInfo] = useState<{
		name?: string;
	} | null>(() => {
		if (typeof window !== "undefined" && !user && storeId) {
			try {
				const storageKey = `rsvp-contact-${storeId}`;
				const stored = localStorage.getItem(storageKey);
				if (stored) {
					const parsed = JSON.parse(stored);
					if (parsed?.name) {
						return { name: parsed.name };
					}
				}
			} catch (error) {
				// Silently handle errors loading from local storage
			}
		}
		return null;
	});

	// Save contact info to local storage when name or phone changes
	const saveContactInfo = useCallback(
		(name?: string, phone?: string) => {
			if (typeof window !== "undefined" && isAnonymousUser && storeId) {
				try {
					// Save name to rsvp-contact-${storeId}
					const storageKey = `rsvp-contact-${storeId}`;
					const nameToSave = name || savedContactInfo?.name || "";
					if (nameToSave) {
						localStorage.setItem(
							storageKey,
							JSON.stringify({ name: nameToSave }),
						);
						setSavedContactInfo({ name: nameToSave });
					}

					// Save phone country code and local number using same keys as FormPhoneOtpInner
					// Extract country code and local number from full phone number
					if (phone) {
						const match = phone.match(/^(\+\d{1,3})(.+)$/);
						if (match) {
							const countryCode = match[1];
							let localNumber = match[2];
							// For Taiwan, ensure we store with leading 0 if it was stripped
							if (countryCode === "+886" && !localNumber.startsWith("0")) {
								// Check if it should have leading 0 (9 digits -> 09XXXXXXXX)
								if (localNumber.length === 9) {
									localNumber = `0${localNumber}`;
								}
							}
							localStorage.setItem("phone_country_code", countryCode);
							localStorage.setItem("phone_local_number", localNumber);
						}
					}
				} catch (error) {
					// Silently handle errors saving to local storage
				}
			}
		},
		[isAnonymousUser, storeId, savedContactInfo],
	);

	// Determine if we're in edit mode
	const isEditMode = Boolean(rsvp);

	// Helper: Get field labels for error messages
	const getFieldLabels = useCallback((): Record<string, string> => {
		return {
			storeId: t("store") || "Store",
			customerId: t("customer") || "Customer",
			name: t("your_name") || "Your Name",
			phone: t("phone") || "Phone",
			facilityId: t("rsvp_facility") || "Facility",
			serviceStaffId: t("service_staff") || "Service Staff",
			numOfAdult: t("rsvp_num_of_adult") || "Number of Adults",
			numOfChild: t("rsvp_num_of_child") || "Number of Children",
			rsvpTime: t("rsvp_time") || "Reservation Time",
			message: t("rsvp_message") || "Message",
		};
	}, [t]);

	// Helper: Get i18n error keys list
	const getI18nErrorKeys = useCallback((): string[] => {
		return [
			"rsvp_name_required_for_anonymous",
			"rsvp_phone_required_for_anonymous",
			"rsvp_name_and_phone_required_for_anonymous",
			"phone_number_required",
			"phone_number_invalid_format",
		];
	}, []);

	// Helper function to check if a facility is available at a given time
	const isFacilityAvailableAtTime = useCallback(
		(
			facility: StoreFacility,
			checkTime: Date | null | undefined,
			timezone: string,
		): boolean => {
			// If no time selected, show all facilities
			if (!checkTime || isNaN(checkTime.getTime())) {
				return true;
			}

			// If facility has no business hours, assume it's always available
			if (!facility.businessHours) {
				return true;
			}

			const result = checkTimeAgainstBusinessHours(
				facility.businessHours,
				checkTime,
				timezone,
			);
			return result.isValid;
		},
		[],
	);

	// Helper function to validate rsvpTime against store business hours or RSVP hours
	const validateRsvpTimeAgainstHours = useCallback(
		(rsvpTime: Date | null | undefined): string | null => {
			if (!rsvpTime || isNaN(rsvpTime.getTime())) {
				return null; // No validation if time is invalid
			}

			const rsvpUseBusinessHours = rsvpSettings?.useBusinessHours ?? true;
			let hoursJson: string | null | undefined = null;
			let errorMessage = "The selected time is outside allowed hours";

			// Logic:
			// 1. If RsvpSettings.useBusinessHours = true, use RsvpSettings.rsvpHours
			if (rsvpUseBusinessHours) {
				hoursJson = rsvpSettings?.rsvpHours ?? null;
				errorMessage = "The selected time is outside RSVP hours";
			}
			// 2. If RsvpSettings.useBusinessHours = false AND Store.useBusinessHours = true, use StoreSettings.businessHours
			else if (storeUseBusinessHours === true) {
				hoursJson = storeSettings?.businessHours ?? null;
				errorMessage = "The selected time is outside store business hours";
			}
			// 3. If RsvpSettings.useBusinessHours = false AND Store.useBusinessHours = false, no validation needed
			else {
				return null; // No validation needed
			}

			// If no hours specified, allow all times
			if (!hoursJson) {
				return null;
			}

			const result = checkTimeAgainstBusinessHours(
				hoursJson,
				rsvpTime,
				storeTimezone,
			);
			return result.isValid ? null : errorMessage;
		},
		[
			rsvpSettings?.useBusinessHours,
			rsvpSettings?.rsvpHours,
			storeSettings?.businessHours,
			storeUseBusinessHours,
			storeTimezone,
		],
	);

	// Default values - different for create vs edit
	const defaultValues = useMemo(() => {
		if (isEditMode && rsvp) {
			// Edit mode: use existing RSVP data
			let rsvpTime: Date;
			if (rsvp.rsvpTime instanceof Date) {
				rsvpTime = rsvp.rsvpTime;
			} else {
				const epochValue = rsvpTimeToEpoch(rsvp.rsvpTime);
				rsvpTime = epochValue
					? (epochToDate(epochValue) ?? new Date())
					: new Date();
				// Validate date
				if (Number.isNaN(rsvpTime.getTime())) {
					rsvpTime = new Date();
				}
			}

			return {
				id: rsvp.id,
				facilityId: rsvp.facilityId || null,
				serviceStaffId: rsvp.serviceStaffId || null, // Include for form state, but disabled in UI
				numOfAdult: rsvp.numOfAdult,
				numOfChild: rsvp.numOfChild,
				rsvpTime,
				message: rsvp.message || "",
			} as UpdateReservationInput;
		} else {
			// Create mode: use default values
			// Only include name and phone for anonymous users (guest users or not logged in)
			const isAnonymous = isAnonymousUser;
			// Load phone from localStorage using same keys as FormPhoneOtpInner
			let defaultPhone = "";
			if (isAnonymous && typeof window !== "undefined") {
				const savedCountryCode = localStorage.getItem("phone_country_code");
				const savedPhoneNumber = localStorage.getItem("phone_local_number");
				if (savedCountryCode && savedPhoneNumber) {
					// Combine country code and local number
					let localNumber = savedPhoneNumber;
					// For Taiwan, ensure we handle leading 0 correctly
					if (savedCountryCode === "+886") {
						// If stored without leading 0, add it back for display
						if (!localNumber.startsWith("0") && localNumber.length === 9) {
							localNumber = `0${localNumber}`;
						}
					}
					defaultPhone = `${savedCountryCode}${localNumber}`;
				}
			}
			return {
				storeId,
				customerId: user?.id || null,
				name: isAnonymous ? savedContactInfo?.name || "" : undefined,
				phone: isAnonymous ? defaultPhone : undefined,
				facilityId: null, // Allow null for reservations without facilities
				serviceStaffId: null, // Default to null for create mode
				numOfAdult: 1,
				numOfChild: 0,
				rsvpTime: defaultRsvpTime || new Date(),
				message: "",
			} as CreateReservationInput;
		}
	}, [
		isEditMode,
		rsvp,
		storeId,
		user,
		defaultRsvpTime,
		savedContactInfo,
		isAnonymousUser,
	]);

	// Use appropriate schema based on mode
	const baseSchema = isEditMode
		? updateReservationSchema
		: createReservationSchema;

	// Form type: union of both input types
	type FormInput = CreateReservationInput | UpdateReservationInput;

	const form = useForm<FormInput>({
		resolver: zodResolver(baseSchema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange", // Real-time validation for better UX
	});

	// Update form when saved contact info loads (for anonymous users)
	useEffect(() => {
		if (!isEditMode && isAnonymousUser) {
			// Update name field if it exists in savedContactInfo
			if (savedContactInfo?.name) {
				form.setValue("name", savedContactInfo.name);
			}
			// Load phone from localStorage using same keys as FormPhoneOtpInner
			if (typeof window !== "undefined") {
				const savedCountryCode = localStorage.getItem("phone_country_code");
				const savedPhoneNumber = localStorage.getItem("phone_local_number");
				if (savedCountryCode && savedPhoneNumber) {
					// Combine country code and local number
					let localNumber = savedPhoneNumber;
					// For Taiwan, ensure we handle leading 0 correctly
					if (savedCountryCode === "+886") {
						// If stored without leading 0, add it back for display
						if (!localNumber.startsWith("0") && localNumber.length === 9) {
							localNumber = `0${localNumber}`;
						}
					}
					const fullPhone = `${savedCountryCode}${localNumber}`;
					form.setValue("phone", fullPhone);
				}
			}
		}
	}, [savedContactInfo, isEditMode, isAnonymousUser, form]);

	// Watch rsvpTime to filter facilities
	const rsvpTime = form.watch("rsvpTime");
	const facilityId = form.watch("facilityId");
	const serviceStaffId = form.watch("serviceStaffId"); // Watch serviceStaffId for cost calculation

	// Always fetch service staff (not conditional on mustHaveServiceStaff)
	const mustHaveServiceStaff = rsvpSettings?.mustHaveServiceStaff ?? false;
	const mustSelectFacility = rsvpSettings?.mustSelectFacility ?? false;
	const { data: serviceStaffData } = useSWR(
		["serviceStaff", storeId],
		async () => {
			const result = await getServiceStaffAction({ storeId });
			return result?.data?.serviceStaff ?? [];
		},
	);
	const serviceStaff: ServiceStaffColumn[] = serviceStaffData ?? [];

	// Helper function to check if service staff is available at a given time
	const isServiceStaffAvailableAtTime = useCallback(
		(
			staff: ServiceStaffColumn,
			checkTime: Date | null | undefined,
			timezone: string,
		): boolean => {
			// If no time selected, show all service staff
			if (!checkTime || isNaN(checkTime.getTime())) {
				return true;
			}

			// If service staff has no business hours, assume it's always available
			if (!staff.businessHours) {
				return true;
			}

			const result = checkTimeAgainstBusinessHours(
				staff.businessHours,
				checkTime,
				timezone,
			);
			return result.isValid;
		},
		[],
	);

	// Filter service staff based on rsvpTime and business hours
	// When editing, always include the current service staff even if it's not available at the selected time
	const availableServiceStaff = useMemo(() => {
		if (!serviceStaff || serviceStaff.length === 0) {
			return [];
		}

		// Filter by business hours availability
		let filtered = serviceStaff.filter((staff: ServiceStaffColumn) =>
			isServiceStaffAvailableAtTime(staff, rsvpTime, storeTimezone),
		);

		// When editing, always include the current service staff even if it's not available at the selected time
		if (isEditMode && rsvp?.serviceStaffId) {
			const currentStaff = serviceStaff.find(
				(s) => s.id === rsvp.serviceStaffId,
			);
			if (currentStaff && !filtered.find((s) => s.id === currentStaff.id)) {
				filtered = [currentStaff, ...filtered];
			}
		}

		return filtered;
	}, [
		serviceStaff,
		rsvpTime,
		storeTimezone,
		isServiceStaffAvailableAtTime,
		isEditMode,
		rsvp?.serviceStaffId,
	]);

	// Filter facilities based on rsvpTime and existing reservations
	// When editing, always include the current facility even if it's not available at the selected time
	const availableFacilities = useMemo(() => {
		// Use same naming as store admin for consistency
		const storeFacilities = facilities;

		if (!storeFacilities) {
			return [];
		}
		if (!rsvpTime || isNaN(rsvpTime.getTime())) {
			return storeFacilities;
		}

		// First filter by business hours availability
		let filtered = storeFacilities.filter((facility: StoreFacility) =>
			isFacilityAvailableAtTime(facility, rsvpTime, storeTimezone),
		);

		// Get singleServiceMode setting
		const singleServiceMode = rsvpSettings?.singleServiceMode ?? false;
		const defaultDuration = rsvpSettings?.defaultDuration ?? 60;

		// Convert rsvpTime to epoch for comparison
		const rsvpTimeEpoch = dateToEpoch(rsvpTime);
		if (!rsvpTimeEpoch) {
			return filtered;
		}

		// Calculate slot duration in milliseconds
		const durationMs = defaultDuration * 60 * 1000;
		const slotStart = Number(rsvpTimeEpoch);
		const slotEnd = slotStart + durationMs;

		// Remove facilities that are already reserved in the same time slot
		const existingFacilityIds = new Set(
			existingReservations
				.filter((r) => {
					// Exclude the current reservation being edited
					if (isEditMode && r.id === rsvp?.id) {
						return false;
					}

					// Exclude cancelled reservations
					if (r.status === RsvpStatus.Cancelled) {
						return false;
					}

					// Check if reservation is in the same time slot
					const existingRsvpTime = rsvpTimeToEpoch(r.rsvpTime);
					if (!existingRsvpTime) {
						return false;
					}

					const existingStart = Number(existingRsvpTime);

					// Quick check: if reservations are on different days (more than 24 hours apart), they can't overlap
					const timeDiff = Math.abs(slotStart - existingStart);
					const oneDayMs = 24 * 60 * 60 * 1000;
					if (timeDiff >= oneDayMs) {
						return false; // Different days, no overlap possible
					}

					// Get duration from facility or use default
					const existingDuration =
						r.Facility?.defaultDuration ?? defaultDuration;
					const existingDurationMs = existingDuration * 60 * 1000;
					const existingEnd = existingStart + existingDurationMs;

					// Check if slots overlap (they overlap if one starts before the other ends)
					return slotStart < existingEnd && slotEnd > existingStart;
				})
				.map((r) => r.facilityId)
				.filter((id): id is string => Boolean(id)),
		);

		filtered = filtered.filter(
			(facility) => !existingFacilityIds.has(facility.id),
		);

		// Find existing reservations that overlap with this time slot
		const conflictingReservations = existingReservations.filter(
			(existingRsvp) => {
				// Exclude the current reservation being edited
				if (isEditMode && existingRsvp.id === rsvp?.id) {
					return false;
				}

				// Exclude cancelled reservations
				if (existingRsvp.status === RsvpStatus.Cancelled) {
					return false;
				}

				// Convert existing reservation time to epoch
				const existingRsvpTime = rsvpTimeToEpoch(existingRsvp.rsvpTime);
				if (!existingRsvpTime) {
					return false;
				}

				const existingStart = Number(existingRsvpTime);
				// Get duration from facility or use default
				const existingDuration =
					existingRsvp.Facility?.defaultDuration ?? defaultDuration;
				const existingDurationMs = existingDuration * 60 * 1000;
				const existingEnd = existingStart + existingDurationMs;

				// Check if slots overlap (they overlap if one starts before the other ends)
				return slotStart < existingEnd && slotEnd > existingStart;
			},
		);

		if (singleServiceMode) {
			// Single Service Mode: If ANY reservation exists, filter out ALL facilities
			if (conflictingReservations.length > 0) {
				filtered = [];
			}
		} else {
			// Default Mode: Filter out only facilities that have reservations
			const bookedFacilityIds = new Set(
				conflictingReservations
					.map((r) => r.facilityId)
					.filter((id): id is string => Boolean(id)),
			);

			filtered = filtered.filter(
				(facility) => !bookedFacilityIds.has(facility.id),
			);
		}

		// When editing, ensure the current facility is included even if filtered out
		// Use form's facilityId first, then fall back to rsvp.facilityId
		const currentFacilityId = form.getValues("facilityId") || rsvp?.facilityId;
		if (isEditMode && currentFacilityId) {
			const currentFacility = storeFacilities.find(
				(f: StoreFacility) => f.id === currentFacilityId,
			);
			if (
				currentFacility &&
				!filtered.find((f: StoreFacility) => f.id === currentFacility.id)
			) {
				filtered.push(currentFacility);
			}
		}

		return filtered;
	}, [
		facilities,
		rsvpTime,
		storeTimezone,
		isFacilityAvailableAtTime,
		isEditMode,
		form,
		rsvp?.facilityId,
		rsvp?.id,
		rsvpSettings?.singleServiceMode,
		rsvpSettings?.defaultDuration,
		existingReservations,
	]);

	// Trigger validation when mustHaveServiceStaff changes
	useEffect(() => {
		if (mustHaveServiceStaff) {
			form.trigger("serviceStaffId");
		} else {
			form.clearErrors("serviceStaffId");
		}
	}, [mustHaveServiceStaff, form]);

	// Trigger validation for facilityId when mustSelectFacility changes or facilityId changes
	useEffect(() => {
		if (mustSelectFacility && availableFacilities.length > 0) {
			form.trigger("facilityId");
		} else {
			form.clearErrors("facilityId");
		}
	}, [mustSelectFacility, availableFacilities.length, facilityId, form]);

	// Get selected facility for cost calculation
	const selectedFacility = useMemo(() => {
		if (!facilityId) return null;
		return availableFacilities.find((f) => f.id === facilityId) || null;
	}, [facilityId, availableFacilities]);

	// Get facility cost for prepaid calculation
	const facilityCost = useMemo(() => {
		if (selectedFacility?.defaultCost) {
			return typeof selectedFacility.defaultCost === "number"
				? selectedFacility.defaultCost
				: Number(selectedFacility.defaultCost);
		}
		return null;
	}, [selectedFacility]);

	// Get selected service staff for cost calculation
	const selectedServiceStaff = useMemo(() => {
		if (!serviceStaffId) return null;
		return serviceStaff.find((s) => s.id === serviceStaffId) || null;
	}, [serviceStaffId, serviceStaff]);

	// Get service staff cost for prepaid calculation
	const serviceStaffCost = useMemo(() => {
		if (selectedServiceStaff?.defaultCost) {
			return typeof selectedServiceStaff.defaultCost === "number"
				? selectedServiceStaff.defaultCost
				: Number(selectedServiceStaff.defaultCost);
		}
		return null;
	}, [selectedServiceStaff]);

	// Calculate total cost (facility + service staff)
	// Use debounced API call
	// Use debounced API call
	const [debouncedRsvpTime] = useDebounceValue(rsvpTime, 500);
	const [debouncedFacilityId] = useDebounceValue(facilityId, 300);
	const [debouncedServiceStaffId] = useDebounceValue(serviceStaffId, 300);

	const { data: pricingData, isLoading: isPricingLoading } = useSWR(
		debouncedRsvpTime && (debouncedFacilityId || debouncedServiceStaffId)
			? [
					"/api/storeAdmin",
					storeId,
					"facilities",
					"calculate-pricing",
					debouncedRsvpTime,
					debouncedFacilityId,
					debouncedServiceStaffId,
				]
			: null,
		async () => {
			if (!debouncedRsvpTime) return null;

			const res = await fetch(
				`/api/storeAdmin/${storeId}/facilities/calculate-pricing`,
				{
					method: "POST",
					body: JSON.stringify({
						facilityId: debouncedFacilityId || null,
						serviceStaffId: debouncedServiceStaffId || null,
						rsvpTime: debouncedRsvpTime.toISOString(),
					}),
				},
			);

			if (!res.ok) throw new Error("Failed to calculate price");
			return res.json();
		},
	);

	const totalCost = useMemo(() => {
		if (pricingData && typeof pricingData.totalCost === "number") {
			return pricingData.totalCost;
		}

		const facility = facilityCost ?? 0;
		const staff = serviceStaffCost ?? 0;
		return facility + staff;
	}, [facilityCost, serviceStaffCost, pricingData]);

	// Calculate cancel policy information (for both create and edit modes when rsvpTime is selected)
	const cancelPolicyInfo = useMemo(() => {
		if (!rsvpTime || isNaN(rsvpTime.getTime())) {
			return null;
		}
		// Get alreadyPaid from the existing reservation (if in edit mode), otherwise false
		const alreadyPaid =
			isEditMode && rsvp ? (rsvp.alreadyPaid ?? false) : false;
		return calculateCancelPolicyInfo(rsvpSettings, rsvpTime, alreadyPaid);
	}, [isEditMode, rsvp, rsvpSettings, rsvpTime]);

	// Update form when defaultRsvpTime changes (create mode) or rsvp changes (edit mode)
	useEffect(() => {
		if (isEditMode) {
			form.reset(defaultValues);
		} else if (defaultRsvpTime) {
			form.setValue("rsvpTime", defaultRsvpTime);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultRsvpTime, rsvp?.id, isEditMode]);

	// Clear facility selection if it's no longer available
	useEffect(() => {
		const currentFacilityId = form.getValues("facilityId");
		if (
			currentFacilityId &&
			!availableFacilities.find((f) => f.id === currentFacilityId)
		) {
			form.setValue(
				"facilityId",
				availableFacilities.length > 0 ? availableFacilities[0].id : "",
			);
		}
	}, [availableFacilities, form]);

	// Prepaid requirement derived from percentage and actual total cost
	const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;
	const prepaidRequired = (minPrepaidPercentage ?? 0) > 0 && totalCost > 0;
	// Anonymous users can create reservations with prepaid - they'll pay at checkout
	const acceptReservation = rsvpSettings?.acceptReservation ?? true; // Default to true
	// Note: isBlacklisted is not passed to ReservationForm, so we rely on server-side validation
	// The form will show an error message if the server rejects due to blacklist
	const canCreateReservation = isEditMode || acceptReservation; // Allow edit, but check acceptReservation for create

	async function onSubmit(data: FormInput) {
		// Check if reservations are accepted (only for create mode)
		if (!isEditMode && rsvpSettings && !rsvpSettings.acceptReservation) {
			toastError({
				title: t("Error"),
				description: t("rsvp_not_currently_accepted"),
			});
			return;
		}

		// Prevent editing completed reservations (customer restriction)
		if (isEditMode && rsvp && rsvp.status === RsvpStatus.Completed) {
			toastError({
				title: t("Error"),
				description:
					t("rsvp_completed_reservation_cannot_update") ||
					"Completed reservations cannot be updated",
			});
			return;
		}

		// Validate facility is required when mustSelectFacility is true and facilities are available
		if (
			mustSelectFacility &&
			availableFacilities.length > 0 &&
			!data.facilityId
		) {
			toastError({
				title: t("Error"),
				description: t("facility_required"),
			});
			form.setError("facilityId", {
				type: "manual",
				message: t("facility_required"),
			});
			return;
		}

		// Validate service staff is required when mustHaveServiceStaff is true
		if (mustHaveServiceStaff && !data.serviceStaffId) {
			toastError({
				title: t("Error"),
				description: t("service_staff_required"),
			});
			form.setError("serviceStaffId", {
				type: "manual",
				message: t("service_staff_required"),
			});
			return;
		}

		// Validate reservation time window (client-side check)
		if (data.rsvpTime) {
			const { getReservationTimeWindowError } = await import(
				"@/utils/rsvp-time-window-utils"
			);
			const timeWindowError = getReservationTimeWindowError(
				rsvpSettings,
				data.rsvpTime,
			);
			if (timeWindowError) {
				toastError({
					title: t("Error"),
					description: timeWindowError,
				});
				form.setError("rsvpTime", {
					type: "manual",
					message: timeWindowError,
				});
				return;
			}
		}

		setIsSubmitting(true);

		try {
			let result:
				| Awaited<ReturnType<typeof createReservationAction>>
				| Awaited<ReturnType<typeof updateReservationAction>>
				| undefined;
			if (isEditMode) {
				// Update mode
				result = await updateReservationAction(data as UpdateReservationInput);
			} else {
				// Create mode
				result = await createReservationAction(data as CreateReservationInput);
			}

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
			} else {
				if (isEditMode) {
					// Always call onReservationUpdated to update client state
					// This ensures the calendar component updates its state immediately
					if (result?.data?.rsvp) {
						const updatedRsvp = result.data.rsvp as Rsvp;

						// Call callback immediately to update client state
						onReservationUpdated?.(updatedRsvp);

						// Update local storage for anonymous users
						if (!user && storeId) {
							try {
								const storageKey = `rsvp-${storeId}`;
								const storedData = localStorage.getItem(storageKey);
								if (storedData) {
									const localReservations: Rsvp[] = JSON.parse(storedData);
									const updatedLocal = localReservations.map((r) =>
										r.id === updatedRsvp.id
											? transformReservationForStorage(updatedRsvp)
											: r,
									);
									localStorage.setItem(
										storageKey,
										JSON.stringify(updatedLocal),
									);
								}
							} catch (error) {
								// Silently handle errors updating local storage
							}
						}

						toastSuccess({
							description: t("reservation_updated"),
						});

						// if associated order is still unpaid, bring user to checkout page
						if (updatedRsvp.orderId && !updatedRsvp.alreadyPaid) {
							router.push(`/checkout/${updatedRsvp.orderId}`);
						}
					} else {
						//something went wrong??
						clientLogger.error(
							"Something went wrong when updating reservation",
							{
								metadata: {
									result: result,
								},
							},
						);
						toastError({
							title: t("Error"),
							description: t("Something went wrong when updating reservation"),
						});
					}
				} else {
					// Create mode
					if (result?.data?.rsvp) {
						const data = result.data as {
							rsvp: Rsvp;
							orderId?: string | null;
						};
						const orderId = data.orderId;

						// Create anonymous user session if user is anonymous
						if (isAnonymousUser) {
							try {
								const anonymousSignInResult =
									await authClient.signIn.anonymous();
								if (anonymousSignInResult.data?.user) {
									clientLogger.info(
										"Created anonymous user session after reservation",
										{
											metadata: {
												userId: anonymousSignInResult.data.user.id,
												rsvpId: data.rsvp.id,
												storeId,
											},
											tags: ["reservation", "anonymous", "session"],
										},
									);
								} else if (anonymousSignInResult.error) {
									clientLogger.error(
										"Failed to create anonymous user session",
										{
											metadata: {
												error: anonymousSignInResult.error.message,
												rsvpId: data.rsvp.id,
												storeId,
											},
											tags: ["reservation", "anonymous", "error"],
										},
									);
									// Continue even if anonymous session creation fails
								}
							} catch (error) {
								clientLogger.error("Error creating anonymous user session", {
									metadata: {
										error:
											error instanceof Error ? error.message : String(error),
										rsvpId: data.rsvp.id,
										storeId,
									},
									tags: ["reservation", "anonymous", "error"],
								});
								// Continue even if anonymous session creation fails
							}
						}

						// Always call onReservationCreated to update client state
						// This ensures the calendar component updates its state immediately
						onReservationCreated?.(data.rsvp);

						// Save reservation to local storage for anonymous users
						// Note: This is also handled by handleReservationCreated in the calendar,
						// but we do it here too for immediate persistence
						if (isAnonymousUser) {
							try {
								const storageKey = `rsvp-${storeId}`;
								const existingData = localStorage.getItem(storageKey);
								const existingReservations: Rsvp[] = existingData
									? JSON.parse(existingData)
									: [];

								// Check if reservation already exists in local storage
								const existsInStorage = existingReservations.some(
									(r) => r.id === data.rsvp.id,
								);

								if (!existsInStorage) {
									// Transform reservation data for localStorage (convert BigInt to number)
									const reservationForStorage = transformReservationForStorage(
										data.rsvp,
									);

									// Append new reservation to existing array
									const updatedReservations = [
										...existingReservations,
										reservationForStorage,
									];

									// Save back to localStorage
									localStorage.setItem(
										storageKey,
										JSON.stringify(updatedReservations),
									);
								}
							} catch (error) {
								// Silently handle errors saving to local storage
							}
						}

						// If total > 0 and prepaid is required, go to checkout regardless of authentication
						// (prepaidRequired is already calculated above using totalCost)
						if (prepaidRequired && totalCost > 0) {
							if (orderId) {
								// Order already created: redirect to checkout
								router.push(`/checkout/${orderId}`);
							} else {
								// No order yet (anonymous user): redirect to checkout
								// The checkout page will handle creating the order for this reservation
								// Anonymous users can pay at checkout without signing in first
								router.push(`/checkout?rsvpId=${data.rsvp.id}`);
							}
						} else if (orderId) {
							// Order exists but prepaid not required: still go to checkout
							router.push(`/checkout/${orderId}`);
						} else {
							// No prepaid required: show success message
							toastSuccess({
								description: t("reservation_created"),
							});

							// Check if the reservation cannot be canceled and show warning
							let cannotCancel = false;

							// Case 1: Cancellation is completely disabled
							if (!rsvpSettings?.canCancel) {
								cannotCancel = true;
							}
							// Case 2: Cancellation is enabled but reservation is within cancelHours window
							else if (
								rsvpSettings.canCancel &&
								rsvpSettings.cancelHours !== null &&
								rsvpSettings.cancelHours !== undefined
							) {
								const cancelHours = rsvpSettings.cancelHours ?? 24;
								const now = getUtcNow();
								const rsvpTimeEpoch = rsvpTimeToEpoch(data.rsvp.rsvpTime);
								const rsvpTimeDate = rsvpTimeEpoch
									? epochToDate(rsvpTimeEpoch)
									: null;

								if (rsvpTimeDate) {
									const hoursUntilReservation =
										(rsvpTimeDate.getTime() - now.getTime()) / (1000 * 60 * 60);

									// Cannot cancel if reservation is within cancelHours window
									cannotCancel = hoursUntilReservation < cancelHours;
								}
							}

							if (cannotCancel) {
								toastWarning({
									title: t("warning"),
									description: t("rsvp_can_not_be_cancelled"),
								});
							}

							// Reset form after successful submission
							form.reset(defaultValues as CreateReservationInput);
						}
					} else {
						// Fallback: show success message even if no RSVP data
						toastSuccess({
							description: t("reservation_created"),
						});
						form.reset(defaultValues as CreateReservationInput);
					}
				}
			}
		} catch (error) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	const formContent = (
		<>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					{/* Date and Time */}
					<FormField
						control={form.control}
						name="rsvpTime"
						render={({ field, fieldState }) => {
							// Validate time against store/RSVP hours when it changes
							const timeValidationError = field.value
								? validateRsvpTimeAgainstHours(field.value)
								: null;

							return (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>
										{t("rsvp_time")} <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										{isEditMode ? (
											// Edit mode: Use SlotPicker
											<div
												className={cn(
													"border rounded-lg p-4",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											>
												<SlotPicker
													existingReservations={existingReservations}
													rsvpSettings={rsvpSettings}
													storeSettings={storeSettings || null}
													storeTimezone={storeTimezone}
													currentRsvpId={rsvp?.id}
													selectedDateTime={field.value || null}
													facilityId={facilityId}
													serviceStaffId={serviceStaffId}
													facilities={facilities}
													onSlotSelect={(dateTime) => {
														// dateTime is already a UTC Date object from convertStoreTimezoneToUtc
														// No need for additional conversion
														if (!dateTime) {
															field.onChange(null);
															return;
														}

														// Validate the date
														if (isNaN(dateTime.getTime())) {
															// Silently ignore invalid dates
															return;
														}

														field.onChange(dateTime);
													}}
												/>
											</div>
										) : (
											// Create mode: Display date/time (read-only)
											<div
												className={cn(
													"flex h-10 w-full items-center gap-2 rounded-md px-0 py-2 font-semibold text-xl ring-offset-background",
													fieldState.error &&
														"border border-destructive focus-visible:ring-destructive",
												)}
											>
												{field.value ? (
													(() => {
														try {
															// Ensure we have a proper Date object
															const utcDate =
																field.value instanceof Date
																	? field.value
																	: new Date(field.value);

															// Validate date
															if (Number.isNaN(utcDate.getTime())) {
																return (
																	<span className="text-muted-foreground">
																		Invalid date
																	</span>
																);
															}

															// Convert UTC date to store timezone
															const storeDate = getDateInTz(
																utcDate,
																getOffsetHours(storeTimezone),
															);

															// Format date: "2026年1月8日 週四" (or equivalent in other locales)
															const dateFormatted = format(
																storeDate,
																"yyyy年M月d日 EEEE",
																{ locale: dateLocale },
															);

															// Format time: "下午8:30" (or equivalent in other locales)
															const timeFormatted = format(storeDate, "ah:mm", {
																locale: dateLocale,
															});

															return (
																<div className="flex items-center gap-2">
																	<div className="flex items-center gap-1.5">
																		<IconCalendar className="h-4 w-4 text-muted-foreground" />
																		<span>{dateFormatted}</span>
																	</div>
																	<div className="flex items-center gap-1.5">
																		<IconClock className="h-4 w-4 text-muted-foreground" />
																		<span>{timeFormatted}</span>
																	</div>
																</div>
															);
														} catch {
															return (
																<span className="text-muted-foreground">
																	Invalid date
																</span>
															);
														}
													})()
												) : (
													<span className="text-muted-foreground">
														No date selected
													</span>
												)}
											</div>
										)}
									</FormControl>
									{timeValidationError && (
										<p className="text-sm font-medium text-destructive">
											{timeValidationError}
										</p>
									)}
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					{/* Number of Adults and Children */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="numOfAdult"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>
										{t("rsvp_num_of_adult")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={1}
											disabled={isSubmitting}
											{...field}
											onChange={(e) => {
												field.onChange(Number.parseInt(e.target.value, 10));
											}}
											className={cn(
												"h-10 text-base sm:h-9 sm:text-sm",
												fieldState.error &&
													"border-destructive focus-visible:ring-destructive",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="numOfChild"
							render={({ field, fieldState }) => (
								<FormItem
									className={cn(
										fieldState.error &&
											"rounded-md border border-destructive/50 bg-destructive/5 p-2",
									)}
								>
									<FormLabel>{t("rsvp_num_of_child")}</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={0}
											disabled={isSubmitting}
											{...field}
											onChange={(e) => {
												field.onChange(Number.parseInt(e.target.value, 10));
											}}
											className={cn(
												"h-10 text-base sm:h-9 sm:text-sm",
												fieldState.error &&
													"border-destructive focus-visible:ring-destructive",
											)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Facility Selection - Always show if mustSelectFacility is true, otherwise hide if no facilities available (unless editing with existing facility) */}
					{(mustSelectFacility ||
						availableFacilities.length > 0 ||
						(isEditMode && rsvp?.facilityId)) && (
						<FormField
							control={form.control}
							name="facilityId"
							render={({ field, fieldState }) => {
								const selectedFacility = field.value
									? availableFacilities.find((f) => f.id === field.value) ||
										null
									: null;

								return (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											{t("rsvp_facility")}
											{mustSelectFacility && availableFacilities.length > 0 && (
												<span className="text-destructive"> *</span>
											)}
										</FormLabel>
										<FormControl>
											{availableFacilities.length > 0 ? (
												<FacilityCombobox
													storeFacilities={availableFacilities}
													disabled={isSubmitting || isEditMode}
													defaultValue={selectedFacility}
													allowNone={false}
													onValueChange={(facility: StoreFacility | null) => {
														field.onChange(facility?.id || null);
													}}
												/>
											) : null}
										</FormControl>
										{selectedFacility && selectedFacility.defaultCost && (
											<div className="text-sm text-muted-foreground">
												{t("rsvp_facility_cost")}:{" "}
												{typeof selectedFacility.defaultCost === "number"
													? selectedFacility.defaultCost.toFixed(2)
													: Number(selectedFacility.defaultCost).toFixed(2)}
											</div>
										)}
										{availableFacilities.length === 0 && mustSelectFacility && (
											<div className="text-sm text-destructive">
												{rsvpTime
													? t("facility_required") ||
														"Facility is required but no facilities are available at selected time"
													: t("facility_required") ||
														"Facility is required but no facilities are available"}
											</div>
										)}
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					)}

					{/* Service Staff Selection - Show only when staff is available or required */}
					{(mustHaveServiceStaff ||
						availableServiceStaff.length > 0 ||
						(isEditMode && rsvp?.serviceStaffId)) && (
						<FormField
							control={form.control}
							name="serviceStaffId"
							render={({ field, fieldState }) => {
								const selectedServiceStaff = field.value
									? serviceStaff.find((s) => s.id === field.value) || null
									: null;

								return (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											{t("service_staff")}
											{mustHaveServiceStaff && (
												<span className="text-destructive"> *</span>
											)}
										</FormLabel>
										<FormControl>
											{availableServiceStaff.length > 0 ? (
												<ServiceStaffCombobox
													serviceStaff={availableServiceStaff}
													disabled={
														isSubmitting ||
														isEditMode /* Customers cannot change service staff when editing */
													}
													defaultValue={selectedServiceStaff || null}
													allowEmpty={true}
													storeCurrency={storeCurrency}
													onValueChange={(staff) => {
														field.onChange(staff?.id || null);
													}}
												/>
											) : null}
										</FormControl>
										{selectedServiceStaff &&
											selectedServiceStaff.defaultCost &&
											(() => {
												const costValue =
													typeof selectedServiceStaff.defaultCost === "number"
														? selectedServiceStaff.defaultCost
														: Number(selectedServiceStaff.defaultCost);
												if (costValue > 0) {
													const formatter = new Intl.NumberFormat("en-US", {
														style: "currency",
														currency: storeCurrency.toUpperCase(),
														maximumFractionDigits: 0,
														minimumFractionDigits: 0,
													});
													return (
														<div className="text-sm text-muted-foreground">
															{t("rsvp_service_staff_cost") ||
																"Service Staff Cost"}
															: {formatter.format(costValue)}
														</div>
													);
												}
												return null;
											})()}
										{availableServiceStaff.length === 0 &&
											mustHaveServiceStaff && (
												<div className="text-sm text-destructive">
													{rsvpTime
														? t("no_service_staff_available_at_selected_time")
														: t("no_service_staff_available")}
												</div>
											)}
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					)}

					{/* Contact Information - Only show for anonymous users (guest users or not logged in) */}
					{!isEditMode &&
						(!user ||
							(user.email &&
								user.email.startsWith("guest-") &&
								user.email.endsWith("@riben.life"))) && (
							<div className="space-y-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("your_name") || "Your Name"}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													placeholder={t("your_name") || "Enter your name"}
													disabled={isSubmitting}
													{...field}
													onChange={(e) => {
														const value = e.target.value;
														field.onChange(value);
														// Save to local storage
														saveContactInfo(value, form.getValues("phone"));
														// Clear errors and trigger re-validation when user types
														if (fieldState.error) {
															form.clearErrors("name");
														}
														// Trigger validation for both name and phone to re-check the refine condition
														if (value.trim().length > 0) {
															form.trigger(["name", "phone"]);
														}
													}}
													className={cn(
														"h-10 text-base sm:h-9 sm:text-sm",
														fieldState.error &&
															"border-destructive focus-visible:ring-destructive",
													)}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="phone"
									render={({ field, fieldState }) => {
										// Parse full phone number to extract country code and local number
										const fullPhone = field.value || "";
										let currentCountryCode = phoneCountryCode;
										let localPhoneNumber = "";

										// Extract country code and local number from full phone
										if (fullPhone.startsWith("+886")) {
											currentCountryCode = "+886";
											localPhoneNumber = fullPhone.replace("+886", "");
										} else if (fullPhone.startsWith("+1")) {
											currentCountryCode = "+1";
											localPhoneNumber = fullPhone.replace("+1", "");
										} else if (fullPhone.startsWith("+")) {
											// Other country code - try to extract
											const match = fullPhone.match(/^(\+\d{1,3})(.+)$/);
											if (match) {
												currentCountryCode = match[1];
												localPhoneNumber = match[2];
											}
										} else if (fullPhone) {
											// No country code, assume it's local number for current country code
											localPhoneNumber = fullPhone;
										}

										// Update country code state if it changed
										if (currentCountryCode !== phoneCountryCode) {
											setPhoneCountryCode(currentCountryCode);
										}

										// Helper to combine country code + local number and update form field
										const updateFullPhone = (
											countryCode: string,
											localNumber: string,
										) => {
											// Strip non-numeric characters from local number
											const cleaned = localNumber.replace(/\D/g, "");
											if (!cleaned) {
												field.onChange("");
												// Save empty phone to local storage
												saveContactInfo(form.getValues("name"), "");
												return;
											}

											// For Taiwan, strip leading 0 if present before combining
											let numberToCombine = cleaned;
											if (countryCode === "+886" && cleaned.startsWith("0")) {
												numberToCombine = cleaned.slice(1);
											}

											const fullPhoneNumber = `${countryCode}${numberToCombine}`;
											field.onChange(fullPhoneNumber);

											// Save to local storage
											saveContactInfo(form.getValues("name"), fullPhoneNumber);

											// Clear errors and trigger re-validation
											if (fieldState.error) {
												form.clearErrors("phone");
											}
											if (cleaned.length > 0) {
												form.trigger(["name", "phone"]);
											}
										};

										return (
											<FormItem
												className={cn(
													fieldState.error &&
														"rounded-md border border-destructive/50 bg-destructive/5 p-2",
												)}
											>
												<FormLabel>
													{t("phone")}{" "}
													<span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<div className="flex gap-2">
														<PhoneCountryCodeSelector
															value={phoneCountryCode}
															onValueChange={(newCode) => {
																setPhoneCountryCode(newCode);
																// Save country code to local storage
																saveContactInfo(
																	form.getValues("name"),
																	form.getValues("phone"),
																);
																// Clear local number when country changes
																updateFullPhone(newCode, "");
															}}
															disabled={isSubmitting}
															allowedCodes={["+1", "+886"]}
														/>
														<Input
															type="tel"
															placeholder={
																phoneCountryCode === "+886"
																	? t("phone_placeholder") ||
																		"0917-321-893 or 912345678"
																	: t("phone_placeholder_us") || "4155551212"
															}
															disabled={isSubmitting}
															value={localPhoneNumber}
															maxLength={phoneCountryCode === "+886" ? 10 : 10}
															onChange={(e) => {
																// Strip all non-numeric characters (allow only digits)
																const cleaned = e.target.value.replace(
																	/\D/g,
																	"",
																);
																// Allow 10 digits for both +1 and +886 (Taiwan can be 9 or 10)
																const maxLen =
																	phoneCountryCode === "+886" ? 10 : 10;
																const limited = cleaned.slice(0, maxLen);
																updateFullPhone(phoneCountryCode, limited);
																// Save to local storage after updating
																const fullPhone = `${phoneCountryCode}${limited}`;
																saveContactInfo(
																	form.getValues("name"),
																	fullPhone,
																);
															}}
															className={cn(
																"flex-1 h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</div>
												</FormControl>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("phone_format_instruction") ||
														"Enter your mobile number starting with 9 or 09 (Taiwan +886)"}
												</FormDescription>
												<FormMessage />
											</FormItem>
										);
									}}
								/>
							</div>
						)}

					{/* Message/Notes */}
					<FormField
						control={form.control}
						name="message"
						render={({ field, fieldState }) => (
							<FormItem
								className={cn(
									fieldState.error &&
										"rounded-md border border-destructive/50 bg-destructive/5 p-2",
								)}
							>
								<FormLabel>{t("rsvp_message")}</FormLabel>
								<FormControl>
									<Textarea
										placeholder={t("special_requests_or_notes")}
										disabled={isSubmitting}
										{...field}
										value={field.value || ""}
										className={cn(
											"font-mono min-h-[100px]",
											fieldState.error &&
												"border-destructive focus-visible:ring-destructive",
										)}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Separator />

					<div className="space-y-2">
						<p className="text-sm font-medium">
							{t("rsvp_rules_and_restrictions")}
						</p>

						{/* Cancel Policy Information */}
						{cancelPolicyInfo && (
							<RsvpCancelPolicyInfo
								cancelPolicyInfo={cancelPolicyInfo}
								rsvpTime={rsvpTime}
								alreadyPaid={isEditMode ? (rsvp?.alreadyPaid ?? false) : false}
								rsvpSettings={rsvpSettings}
								facilityCost={facilityCost}
								serviceStaffCost={serviceStaffCost}
								currency={storeCurrency}
								useCustomerCredit={useCustomerCredit}
								creditExchangeRate={creditExchangeRate}
							/>
						)}
					</div>

					{/* Submit Button */}

					{/* Validation Error Summary */}
					{Object.keys(form.formState.errors).length > 0 && (
						<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
							<div className="text-sm font-semibold text-destructive">
								{t("please_fix_validation_errors") ||
									"Please fix the following errors:"}
							</div>
							{Object.entries(form.formState.errors).map(([field, error]) => {
								const fieldLabels = getFieldLabels();
								const fieldLabel = fieldLabels[field] || field;
								const errorMessage = error.message as string;
								const i18nErrorKeys = getI18nErrorKeys();
								const translatedMessage = i18nErrorKeys.includes(errorMessage)
									? t(errorMessage)
									: errorMessage;

								return (
									<div
										key={field}
										className="text-sm text-destructive flex items-start gap-2"
									>
										<span className="font-medium">{fieldLabel}:</span>
										<span>{translatedMessage}</span>
									</div>
								);
							})}
						</div>
					)}
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="inline-block w-full">
								<Button
									type="submit"
									disabled={
										isSubmitting ||
										!canCreateReservation ||
										!form.formState.isValid
									}
									className="w-full disabled:opacity-25"
									autoFocus
								>
									{isSubmitting
										? isEditMode
											? t("updating")
											: t("submitting")
										: isEditMode
											? t("update_reservation")
											: t("create_Reservation")}
								</Button>
							</span>
						</TooltipTrigger>
						{(isSubmitting ||
							!canCreateReservation ||
							!form.formState.isValid) && (
							<TooltipContent className="max-w-xs">
								<div className="text-xs space-y-1">
									{isSubmitting ? (
										<div>{t("processing") || "Processing..."}</div>
									) : !canCreateReservation ? (
										<div>
											{t("rsvp_not_currently_accepted") ||
												"Reservations are not currently accepted"}
										</div>
									) : !form.formState.isValid &&
										Object.keys(form.formState.errors).length > 0 ? (
										<div className="space-y-1">
											<div className="font-semibold">
												{t("please_fix_validation_errors") ||
													"Please fix the following errors:"}
											</div>
											{Object.entries(form.formState.errors)
												.slice(0, 3)
												.map(([field, error]) => {
													const fieldLabels = getFieldLabels();
													const fieldLabel = fieldLabels[field] || field;
													const errorMessage = error?.message as string;
													const i18nErrorKeys = getI18nErrorKeys();
													const translatedMessage = i18nErrorKeys.includes(
														errorMessage,
													)
														? t(errorMessage)
														: errorMessage;

													return (
														<div key={field} className="text-xs">
															<span className="font-medium">{fieldLabel}:</span>{" "}
															{translatedMessage}
														</div>
													);
												})}
											{Object.keys(form.formState.errors).length > 3 && (
												<div className="text-xs opacity-75">
													+{Object.keys(form.formState.errors).length - 3} more
													error(s)
												</div>
											)}
										</div>
									) : (
										<div>
											{t("please_fix_validation_errors") ||
												"Please fix validation errors above"}
										</div>
									)}
								</div>
							</TooltipContent>
						)}
					</Tooltip>

					{!isEditMode && !acceptReservation && (
						<p className="text-sm text-destructive text-center">
							{t("rsvp_not_currently_accepted")}
						</p>
					)}
				</form>
			</Form>
		</>
	);

	if (hideCard) {
		return formContent;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<IconCalendarCheck className="h-5 w-5" />
					{isEditMode ? t("edit_reservation") : t("create_Reservation")}
				</CardTitle>
				<CardDescription>
					{isEditMode
						? t("edit_reservation_description")
						: t("create_Reservation_description")}
				</CardDescription>
			</CardHeader>
			<CardContent>{formContent}</CardContent>
		</Card>
	);
}

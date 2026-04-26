"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconCalendar,
	IconCalendarCheck,
	IconClock,
} from "@tabler/icons-react";
import { format, type Locale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { zhTW } from "date-fns/locale/zh-TW";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Control, type Resolver, useForm } from "react-hook-form";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";

import { createReservationAction } from "@/actions/store/reservation/create-reservation";
import {
	type CreateReservationInput,
	createReservationSchema,
} from "@/actions/store/reservation/create-reservation.validation";
import { getServiceStaffAction } from "@/actions/store/reservation/get-service-staff";
import { sendReservationMessageAction } from "@/actions/store/reservation/send-reservation-message";
import { updateReservationAction } from "@/actions/store/reservation/update-reservation";
import {
	type UpdateReservationInput,
	updateReservationSchema,
} from "@/actions/store/reservation/update-reservation.validation";
import { useTranslation } from "@/app/i18n/client";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { PhoneCountryCodeSelector } from "@/components/auth/phone-country-code-selector";
import { FacilityCombobox } from "@/components/combobox-facility";
import { ServiceStaffCombobox } from "@/components/combobox-service-staff";
import { Loader } from "@/components/loader";
import { ProductDescriptionContent } from "@/components/shop/product-description-content";
import { RsvpCancelPolicyInfo } from "@/components/rsvp-cancel-policy-info";
import { RsvpPricingSummary } from "@/components/rsvp-pricing-summary";
import { toastError, toastSuccess, toastWarning } from "@/components/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CustomSessionUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { clientLogger } from "@/lib/client-logger";
import { persistSignedInUserContactIfChanged } from "@/lib/client/persist-signed-in-user-contact";
import type { StoreCustomerManageUser } from "@/lib/store-admin/get-store-customer-profile-for-manage";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { RsvpMode, RsvpStatus } from "@/types/enum";
import {
	dateToEpoch,
	epochToDate,
	getDateInTz,
	getOffsetHours,
	getUtcNow,
	isDateValue,
} from "@/utils/datetime-utils";
import { calculateCancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";
import {
	checkTimeAgainstBusinessHours,
	rsvpTimeToEpoch,
	transformReservationForStorage,
} from "@/utils/rsvp-utils";
import { getEffectiveFacilityBusinessHoursJson } from "@/lib/facility/get-effective-facility-business-hours";
import { validatePhoneNumber } from "@/utils/phone-utils";
import {
	type RsvpConversationThreadItem,
	extractRsvpConversationThread,
} from "@/app/s/[storeId]/reservation/lib/extract-rsvp-conversation-thread";
import { SlotPicker } from "./slot-picker";

interface ReservationFormProps {
	storeId: string;
	rsvpSettings: (RsvpSettings & { defaultCost?: number | null }) | null;
	storeSettings?: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | StoreCustomerManageUser | CustomSessionUser | null;
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

function getReservationInitialMessage(rsvp: Rsvp): string {
	const legacyMessage =
		"message" in (rsvp as unknown as Record<string, unknown>)
			? (rsvp as unknown as { message?: string | null }).message
			: null;

	if (legacyMessage && legacyMessage.trim().length > 0) {
		return legacyMessage;
	}

	const firstConversationMessage = (
		rsvp as unknown as {
			RsvpConversation?: {
				Messages?: Array<{ message?: string | null }>;
			} | null;
		}
	).RsvpConversation?.Messages?.[0]?.message;

	return firstConversationMessage ?? "";
}

interface RsvpMessageFormFieldProps {
	control: Control<CreateReservationInput | UpdateReservationInput>;
	isEditMode: boolean;
	isSubmitting: boolean;
	rsvpConversationThread: RsvpConversationThreadItem[];
	storeTimezone: string;
	t: (key: string) => string | undefined;
}

function RsvpMessageFormField({
	control,
	isEditMode,
	isSubmitting,
	rsvpConversationThread,
	storeTimezone,
	t,
}: RsvpMessageFormFieldProps) {
	return (
		<FormField
			control={control}
			name="message"
			render={({ field, fieldState }) => (
				<FormItem
					className={cn(
						fieldState.error &&
							"rounded-md border border-destructive/50 bg-destructive/5 p-2",
					)}
				>
					{isEditMode && rsvpConversationThread.length > 0 ? (
						<div className="mb-3 max-h-52 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
							<p className="text-xs font-medium text-muted-foreground">
								{t("rsvp_conversation_thread")}
							</p>
							<ul className="list-none space-y-2">
								{rsvpConversationThread.map((row) => {
									const isCustomer = row.senderType === "customer";
									const isStore = row.senderType === "store";
									const label = isCustomer
										? t("rsvp_conversation_you")
										: isStore
											? t("rsvp_conversation_store")
											: t("rsvp_conversation_system");
									const d =
										row.createdAtMs > 0
											? epochToDate(BigInt(row.createdAtMs))
											: null;
									const timeLabel =
										d != null
											? format(
													getDateInTz(d, getOffsetHours(storeTimezone)),
													"yyyy-MM-dd HH:mm",
												)
											: null;
									return (
										<li key={row.id} className="w-full list-none">
											<div
												className={cn(
													"flex w-full",
													isCustomer ? "justify-end" : "justify-start",
												)}
											>
												<div
													className={cn(
														"max-w-[min(100%,24rem)] rounded-lg px-3 py-2 text-sm",
														isCustomer && "bg-primary/15 text-foreground",
														isStore && "border bg-background",
														!isCustomer &&
															!isStore &&
															"border border-dashed bg-muted/50 text-xs",
													)}
												>
													<div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
														<span>{label}</span>
														{timeLabel ? (
															<span className="tabular-nums">{timeLabel}</span>
														) : null}
													</div>
													<p className="whitespace-pre-wrap wrap-break-word text-left">
														{row.message}
													</p>
												</div>
											</div>
										</li>
									);
								})}
							</ul>
						</div>
					) : null}
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
	);
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
	const [optimisticConversationMessages, setOptimisticConversationMessages] =
		useState<RsvpConversationThreadItem[]>([]);

	// Helper function to check if user is anonymous (guest user)
	const isAnonymousUser = useMemo(() => {
		if (!user) return true; // No user = anonymous
		// Check if user email matches guest pattern (guest-{id}@riben.life)
		return (
			user.email?.startsWith("guest-") && user.email.endsWith("@riben.life")
		);
	}, [user]);

	const isEditMode = Boolean(rsvp);
	const isTimeLockedByConfirmation = useMemo(
		() =>
			isEditMode &&
			Boolean(rsvp?.confirmedByStore) &&
			Boolean(rsvp?.confirmedByCustomer),
		[isEditMode, rsvp?.confirmedByStore, rsvp?.confirmedByCustomer],
	);

	const rsvpConversationThread = useMemo(() => {
		const fromServer = extractRsvpConversationThread(rsvp);
		const merged = [...fromServer, ...optimisticConversationMessages].sort(
			(a, b) => a.createdAtMs - b.createdAtMs,
		);
		return merged;
	}, [rsvp, optimisticConversationMessages]);

	useEffect(() => {
		setOptimisticConversationMessages([]);
	}, [rsvp?.id]);

	const userProfilePhone = useMemo(
		() =>
			user && typeof user === "object" && "phoneNumber" in user
				? String(
						(user as { phoneNumber?: string | null }).phoneNumber ?? "",
					).trim()
				: "",
		[user],
	);

	const userProfileName = useMemo(
		() =>
			user && typeof user === "object" && "name" in user
				? String((user as { name?: string | null }).name ?? "").trim()
				: "",
		[user],
	);

	const mustCollectPhoneForSignedIn = useMemo(
		() =>
			!isEditMode &&
			!isAnonymousUser &&
			Boolean(rsvpSettings?.requirePhone) &&
			!userProfilePhone,
		[isEditMode, isAnonymousUser, rsvpSettings?.requirePhone, userProfilePhone],
	);

	const mustCollectNameForSignedIn = useMemo(
		() =>
			!isEditMode &&
			!isAnonymousUser &&
			Boolean(rsvpSettings?.requireName) &&
			!userProfileName,
		[isEditMode, isAnonymousUser, rsvpSettings?.requireName, userProfileName],
	);

	/** Store requires a full (non-guest) account; session is guest or missing */
	const reservationBlockedBySignIn = useMemo(
		() =>
			!isEditMode && Boolean(rsvpSettings?.requireSignIn) && isAnonymousUser,
		[isEditMode, rsvpSettings?.requireSignIn, isAnonymousUser],
	);
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
	const _params = useParams();
	const pathname = usePathname();
	const signInHref = `/signIn?callbackUrl=${encodeURIComponent(pathname || "")}`;
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
					const name = parsed?.name?.trim();
					// Never treat "Anonymous" as a saved name
					if (name && name.toLowerCase() !== "anonymous") {
						return { name: parsed.name };
					}
				}
			} catch (_error) {
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
					// Save name to rsvp-contact-${storeId} (never write "Anonymous")
					const storageKey = `rsvp-contact-${storeId}`;
					const nameToSave = name ?? savedContactInfo?.name ?? "";
					const nameTrimmed = nameToSave.trim();
					const isAnonymousName = nameTrimmed.toLowerCase() === "anonymous";
					if (nameTrimmed && !isAnonymousName) {
						localStorage.setItem(
							storageKey,
							JSON.stringify({ name: nameToSave }),
						);
						setSavedContactInfo({ name: nameToSave });
					} else if (isAnonymousName) {
						localStorage.removeItem(storageKey);
						setSavedContactInfo(null);
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
				} catch (_error) {
					// Silently handle errors saving to local storage
				}
			}
		},
		[isAnonymousUser, storeId, savedContactInfo],
	);

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
			"rsvp_name_required",
			"rsvp_name_required_for_anonymous",
			"rsvp_phone_required_for_anonymous",
			"rsvp_name_and_phone_required_for_anonymous",
			"rsvp_phone_required",
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
			if (!checkTime || Number.isNaN(checkTime.getTime())) {
				return true;
			}

			const facilityHours = getEffectiveFacilityBusinessHoursJson(
				facility,
				rsvpSettings,
				storeUseBusinessHours === true,
				storeSettings?.businessHours ?? null,
			);
			if (!facilityHours) {
				return true;
			}

			const result = checkTimeAgainstBusinessHours(
				facilityHours,
				checkTime,
				timezone,
			);
			return result.isValid;
		},
		[rsvpSettings, storeSettings?.businessHours, storeUseBusinessHours],
	);

	// Default values - different for create vs edit
	const defaultValues = useMemo(() => {
		if (isEditMode && rsvp) {
			// Edit mode: use existing RSVP data
			let rsvpTime: Date;
			if (isDateValue(rsvp.rsvpTime)) {
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
				name: rsvp.name || "",
				phone: rsvp.phone || "",
				numOfAdult: rsvp.numOfAdult,
				numOfChild: rsvp.numOfChild,
				rsvpTime,
				message: getReservationInitialMessage(rsvp),
			} as UpdateReservationInput;
		} else {
			// Create mode: use default values
			// Name/phone: anonymous; or signed-in when store requires name/phone and profile is missing them
			const isAnonymous = isAnonymousUser;
			const needNameField = isAnonymous || mustCollectNameForSignedIn;
			const needPhoneField = isAnonymous || mustCollectPhoneForSignedIn;
			// Load phone from localStorage using same keys as FormPhoneOtpInner
			let defaultPhone = "";
			if (needPhoneField && typeof window !== "undefined") {
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
				name: needNameField
					? isAnonymous
						? savedContactInfo?.name || ""
						: ""
					: undefined,
				phone: needPhoneField ? defaultPhone : undefined,
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
		mustCollectNameForSignedIn,
		mustCollectPhoneForSignedIn,
		rsvpSettings?.requireName,
		rsvpSettings?.requirePhone,
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

	// Update form when saved contact info loads (anonymous; phone when requirePhone)
	useEffect(() => {
		if (
			!isEditMode &&
			(isAnonymousUser ||
				mustCollectNameForSignedIn ||
				mustCollectPhoneForSignedIn)
		) {
			if (isAnonymousUser && savedContactInfo?.name) {
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
	}, [
		savedContactInfo,
		isEditMode,
		isAnonymousUser,
		mustCollectNameForSignedIn,
		mustCollectPhoneForSignedIn,
		form,
	]);

	// Watch rsvpTime to filter facilities
	const rsvpTime = form.watch("rsvpTime");
	const facilityId = form.watch("facilityId");
	const serviceStaffId = form.watch("serviceStaffId"); // Watch serviceStaffId for cost calculation

	// Validate rsvpTime: with a facility, use effective facility hours; otherwise RSVP / store hours.
	const validateRsvpTimeAgainstHours = useCallback(
		(rsvpTimeValue: Date | null | undefined): string | null => {
			if (!rsvpTimeValue || Number.isNaN(rsvpTimeValue.getTime())) {
				return null;
			}

			const currentFacilityId = form.getValues("facilityId");
			const selectedFacility = currentFacilityId
				? facilities.find((f) => f.id === currentFacilityId)
				: null;

			if (selectedFacility) {
				const hoursJson = getEffectiveFacilityBusinessHoursJson(
					selectedFacility,
					rsvpSettings,
					storeUseBusinessHours === true,
					storeSettings?.businessHours ?? null,
				);
				if (!hoursJson) {
					return null;
				}
				const result = checkTimeAgainstBusinessHours(
					hoursJson,
					rsvpTimeValue,
					storeTimezone,
				);
				return result.isValid
					? null
					: t("rsvp_time_outside_business_hours_facility") ||
							"The selected time is outside business hours for this facility";
			}

			const rsvpUseBusinessHours = rsvpSettings?.useBusinessHours ?? true;
			let hoursJson: string | null | undefined = null;
			let errorMessage = "The selected time is outside allowed hours";

			if (rsvpUseBusinessHours) {
				hoursJson = rsvpSettings?.rsvpHours ?? null;
				errorMessage = "The selected time is outside RSVP hours";
			} else if (storeUseBusinessHours === true) {
				hoursJson = storeSettings?.businessHours ?? null;
				errorMessage = "The selected time is outside store business hours";
			} else {
				return null;
			}

			if (!hoursJson) {
				return null;
			}

			const result = checkTimeAgainstBusinessHours(
				hoursJson,
				rsvpTimeValue,
				storeTimezone,
			);
			return result.isValid ? null : errorMessage;
		},
		[
			form,
			facilities,
			rsvpSettings,
			storeSettings?.businessHours,
			storeUseBusinessHours,
			storeTimezone,
			t,
		],
	);

	// Always fetch service staff (not conditional on mustHaveServiceStaff), except
	// RESTAURANT mode: no facility/staff on the form or server.
	// When facility + rsvpTime selected, filter by ServiceStaffFacilitySchedule AND availability at that time.
	const rsvpMode = Number(rsvpSettings?.rsvpMode ?? RsvpMode.FACILITY);
	const isRestaurantMode = rsvpMode === RsvpMode.RESTAURANT;
	const mustHaveServiceStaff = rsvpSettings?.mustHaveServiceStaff ?? false;
	const mustSelectFacility = rsvpSettings?.mustSelectFacility ?? false;
	const effectiveMustHaveServiceStaff =
		!isRestaurantMode && mustHaveServiceStaff;
	const effectiveMustSelectFacility = !isRestaurantMode && mustSelectFacility;
	const reservationInstructionsText = useMemo(
		() => (rsvpSettings?.reservationInstructions?.trim() ?? "") || "",
		[rsvpSettings?.reservationInstructions],
	);

	useEffect(() => {
		if (!isRestaurantMode) {
			return;
		}
		form.setValue("facilityId", null, { shouldValidate: false });
		form.setValue("serviceStaffId", null, { shouldValidate: false });
		form.clearErrors("facilityId");
		form.clearErrors("serviceStaffId");
	}, [isRestaurantMode, form]);

	const rsvpTimeIso =
		facilityId && rsvpTime && !Number.isNaN(new Date(rsvpTime).getTime())
			? (isDateValue(rsvpTime) ? rsvpTime : new Date(rsvpTime)).toISOString()
			: null;

	// In edit mode, always include assigned staff so they appear even if no longer available
	const includeStaffIds =
		isEditMode && rsvp?.serviceStaffId ? [rsvp.serviceStaffId] : undefined;

	const fetchServiceStaff = useCallback(async () => {
		const result = await getServiceStaffAction({
			storeId,
			facilityId: facilityId ?? undefined,
			rsvpTimeIso: rsvpTimeIso ?? undefined,
			storeTimezone: rsvpTimeIso ? storeTimezone : undefined,
			includeStaffIds,
		});
		return result?.data?.serviceStaff ?? [];
	}, [storeId, facilityId, rsvpTimeIso, storeTimezone, includeStaffIds]);

	const { data: serviceStaffData } = useSWR(
		isRestaurantMode
			? null
			: [
					"serviceStaff",
					storeId,
					facilityId ?? "",
					rsvpTimeIso ?? "",
					includeStaffIds?.join(",") ?? "",
				],
		fetchServiceStaff,
	);
	const serviceStaff: ServiceStaffColumn[] = serviceStaffData ?? [];

	// Service staff list is filtered by facility via action (ServiceStaffFacilitySchedule)
	const availableServiceStaff = serviceStaff ?? [];

	// When facility changes, clear service staff if the current selection is not in the new filtered list.
	// In edit mode, skip when staff list is still loading (empty) to avoid clearing before includeStaffIds fetch completes.
	useEffect(() => {
		if (!facilityId || !serviceStaffId) return;
		if (
			isEditMode &&
			rsvp?.serviceStaffId &&
			availableServiceStaff.length === 0
		)
			return;
		const stillAvailable = availableServiceStaff.some(
			(ss: ServiceStaffColumn) => ss.id === serviceStaffId,
		);
		if (!stillAvailable) {
			form.setValue("serviceStaffId", null, { shouldValidate: false });
		}
	}, [
		facilityId,
		serviceStaffId,
		availableServiceStaff,
		form,
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
		if (!rsvpTime || Number.isNaN(rsvpTime.getTime())) {
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
		if (effectiveMustHaveServiceStaff) {
			form.trigger("serviceStaffId");
		} else {
			form.clearErrors("serviceStaffId");
		}
	}, [effectiveMustHaveServiceStaff, form]);

	// Trigger validation for facilityId when mustSelectFacility changes or facilityId changes
	useEffect(() => {
		if (effectiveMustSelectFacility && availableFacilities.length > 0) {
			form.trigger("facilityId");
		} else {
			form.clearErrors("facilityId");
		}
	}, [effectiveMustSelectFacility, availableFacilities.length, form]);

	// Get selected facility for cost calculation
	const selectedFacility = useMemo(() => {
		if (!facilityId) return null;
		return availableFacilities.find((f) => f.id === facilityId) || null;
	}, [facilityId, availableFacilities]);

	// Get selected service staff for cost calculation
	const selectedServiceStaff = useMemo(() => {
		if (!serviceStaffId) return null;
		return serviceStaff.find((s) => s.id === serviceStaffId) || null;
	}, [serviceStaffId, serviceStaff]);

	// Calculate total cost (facility + service staff)
	// Use debounced API call to get pricing with rules applied
	const [debouncedRsvpTime] = useDebounceValue(rsvpTime, 500);
	const [debouncedFacilityId] = useDebounceValue(facilityId, 300);
	const [debouncedServiceStaffId] = useDebounceValue(serviceStaffId, 300);

	// Stable key for pricing SWR (Date -> ISO string avoids reference churn)
	const pricingKey = useMemo(() => {
		if (!debouncedRsvpTime || !(debouncedFacilityId || debouncedServiceStaffId))
			return null;
		const rsvpIso = isDateValue(debouncedRsvpTime)
			? debouncedRsvpTime.toISOString()
			: String(debouncedRsvpTime);
		return [
			"/api/store",
			storeId,
			"facilities",
			"calculate-pricing",
			rsvpIso,
			debouncedFacilityId,
			debouncedServiceStaffId,
		] as const;
	}, [
		storeId,
		debouncedRsvpTime,
		debouncedFacilityId,
		debouncedServiceStaffId,
	]);

	const { data: pricingData, isLoading: isPricingLoading } = useSWR(
		pricingKey,
		async () => {
			if (!debouncedRsvpTime) return null;

			const res = await fetch(
				`/api/store/${storeId}/facilities/calculate-pricing`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
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

	// Get facility cost - use calculated price from API if available, otherwise use default
	const facilityCost = useMemo(() => {
		// Use calculated price from API if available (includes pricing rules)
		if (pricingData?.details?.facility?.discountedCost !== undefined) {
			return pricingData.details.facility.discountedCost;
		}
		// Fallback to default cost
		if (selectedFacility?.defaultCost) {
			return typeof selectedFacility.defaultCost === "number"
				? selectedFacility.defaultCost
				: Number(selectedFacility.defaultCost);
		}
		return null;
	}, [selectedFacility, pricingData]);

	// Get service staff cost - use calculated price from API if available, otherwise use default
	const serviceStaffCost = useMemo(() => {
		// Use calculated price from API if available (includes pricing rules)
		if (pricingData?.details?.serviceStaff?.discountedCost !== undefined) {
			return pricingData.details.serviceStaff.discountedCost;
		}
		// Fallback to default cost
		if (selectedServiceStaff?.defaultCost) {
			return typeof selectedServiceStaff.defaultCost === "number"
				? selectedServiceStaff.defaultCost
				: Number(selectedServiceStaff.defaultCost);
		}
		return null;
	}, [selectedServiceStaff, pricingData]);

	// Calculate total cost - use API result if available, otherwise sum individual costs
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
		if (!rsvpTime || Number.isNaN(rsvpTime.getTime())) {
			return null;
		}
		// Get alreadyPaid from the existing reservation (if in edit mode), otherwise false
		const alreadyPaid =
			isEditMode && rsvp ? (rsvp.alreadyPaid ?? false) : false;
		return calculateCancelPolicyInfo(rsvpSettings, rsvpTime, alreadyPaid);
	}, [isEditMode, rsvp, rsvpSettings, rsvpTime]);

	const editLockedByCancelHours = useMemo(() => {
		if (!isEditMode || !rsvp) {
			return false;
		}
		if (!rsvpSettings?.canCancel) {
			return false;
		}
		if (
			rsvpSettings.cancelHours === null ||
			rsvpSettings.cancelHours === undefined ||
			rsvpSettings.cancelHours === 0
		) {
			return false;
		}

		const originalRsvpEpoch = rsvpTimeToEpoch(rsvp.rsvpTime);
		const originalRsvpDate = originalRsvpEpoch
			? epochToDate(originalRsvpEpoch)
			: null;
		if (!originalRsvpDate) {
			return false;
		}

		const hoursUntilOriginalReservation =
			(originalRsvpDate.getTime() - getUtcNow().getTime()) / (1000 * 60 * 60);
		return hoursUntilOriginalReservation < rsvpSettings.cancelHours;
	}, [isEditMode, rsvp, rsvpSettings]);

	const editLockMessage =
		t("rsvp_reservation_can_only_be_modified_hours_before", {
			hours: rsvpSettings?.cancelHours ?? 0,
		}) ||
		`Reservation can only be modified more than ${rsvpSettings?.cancelHours ?? 0} hours before the reservation time`;

	// Update form when defaultRsvpTime changes (create mode) or rsvp changes (edit mode)
	useEffect(() => {
		if (isEditMode) {
			form.reset(defaultValues);
		} else if (defaultRsvpTime) {
			form.setValue("rsvpTime", defaultRsvpTime);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultRsvpTime, isEditMode, defaultValues, form.reset, form.setValue]);

	// Clear facility selection if it's no longer available
	useEffect(() => {
		if (isRestaurantMode) {
			return;
		}
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
	}, [availableFacilities, form, isRestaurantMode]);

	// Prepaid requirement derived from percentage and actual total cost
	const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;
	const prepaidRequired = (minPrepaidPercentage ?? 0) > 0 && totalCost > 0;
	// Anonymous users can create reservations with prepaid - they'll pay at checkout
	const acceptReservation = rsvpSettings?.acceptReservation ?? true; // Default to true
	// Note: isBlacklisted is not passed to ReservationForm, so we rely on server-side validation
	// The form will show an error message if the server rejects due to blacklist
	const canCreateReservation = isEditMode || acceptReservation; // Allow edit, but check acceptReservation for create

	async function onSubmit(data: FormInput) {
		// Block UI immediately to prevent double submit; clear on early returns
		setIsSubmitting(true);

		// Check if reservations are accepted (only for create mode)
		if (!isEditMode && rsvpSettings && !rsvpSettings.acceptReservation) {
			toastError({
				title: t("Error"),
				description: t("rsvp_not_currently_accepted"),
			});
			setIsSubmitting(false);
			return;
		}

		if (!isEditMode && reservationBlockedBySignIn) {
			toastError({
				title: t("Error"),
				description: t("rsvp_please_sign_in"),
			});
			setIsSubmitting(false);
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
			setIsSubmitting(false);
			return;
		}

		if (isEditMode && editLockedByCancelHours) {
			toastError({
				title: t("Error"),
				description: editLockMessage,
			});
			setIsSubmitting(false);
			return;
		}

		// Validate facility is required when mustSelectFacility is true and facilities are available
		if (
			effectiveMustSelectFacility &&
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
			setIsSubmitting(false);
			return;
		}

		// Validate service staff is required when mustHaveServiceStaff is true
		if (effectiveMustHaveServiceStaff && !data.serviceStaffId) {
			toastError({
				title: t("Error"),
				description: t("service_staff_required"),
			});
			form.setError("serviceStaffId", {
				type: "manual",
				message: t("service_staff_required"),
			});
			setIsSubmitting(false);
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
				setIsSubmitting(false);
				return;
			}
		}

		if (!isEditMode && mustCollectNameForSignedIn) {
			const createData = data as CreateReservationInput;
			const nameTrimmed = (createData.name ?? "").trim();
			if (!nameTrimmed || nameTrimmed.toLowerCase() === "anonymous") {
				toastError({
					title: t("Error"),
					description: t("rsvp_name_required") || "Name is required",
				});
				form.setError("name", {
					type: "manual",
					message: "rsvp_name_required",
				});
				setIsSubmitting(false);
				return;
			}
		}

		if (!isEditMode && mustCollectPhoneForSignedIn) {
			const createData = data as CreateReservationInput;
			const p = (createData.phone ?? "").trim();
			if (!p) {
				toastError({
					title: t("Error"),
					description: t("rsvp_phone_required") || "Phone is required",
				});
				setIsSubmitting(false);
				return;
			}
			if (!validatePhoneNumber(p)) {
				toastError({
					title: t("Error"),
					description:
						t("phone_number_invalid_format") || "Invalid phone number",
				});
				setIsSubmitting(false);
				return;
			}
		}

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
									const reservationForStorage =
										transformReservationForStorage(updatedRsvp);
									const nameTrimmed = form.getValues("name")?.trim() ?? "";
									if (
										nameTrimmed &&
										nameTrimmed.toLowerCase() !== "anonymous"
									) {
										reservationForStorage.name = nameTrimmed;
									} else if (
										(reservationForStorage.name?.trim() ?? "").toLowerCase() ===
										"anonymous"
									) {
										reservationForStorage.name = null;
									}
									const updatedLocal = localReservations.map((r) =>
										r.id === updatedRsvp.id ? reservationForStorage : r,
									);
									localStorage.setItem(
										storageKey,
										JSON.stringify(updatedLocal),
									);
								}
							} catch (_error) {
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

						// Create anonymous user session only when no session exists
						// Skip if user already exists (including existing anonymous/guest users)
						if (!user) {
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

						if (
							!isAnonymousUser &&
							user &&
							typeof user === "object" &&
							"id" in user
						) {
							const u = user as {
								id: string;
								name?: string | null;
								phoneNumber?: string | null;
							};
							const createVals = form.getValues() as CreateReservationInput;
							const sync = await persistSignedInUserContactIfChanged({
								user: {
									id: u.id,
									name: u.name,
									phoneNumber: u.phoneNumber,
								},
								submittedName: createVals.name ?? undefined,
								submittedPhone: createVals.phone ?? undefined,
							});
							if (!sync.ok) {
								toastWarning({
									title: t("Error"),
									description:
										sync.serverError ||
										t("profile_update_failed") ||
										"Reservation saved, but your profile could not be updated.",
								});
							} else if (sync.patched) {
								router.refresh();
							}
						}

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
									// Use customer's entered name; never persist "Anonymous"
									const nameFromForm = form.getValues("name")?.trim() ?? "";
									if (
										nameFromForm &&
										nameFromForm.toLowerCase() !== "anonymous"
									) {
										reservationForStorage.name = nameFromForm;
									} else if (
										(reservationForStorage.name?.trim() ?? "").toLowerCase() ===
										"anonymous"
									) {
										reservationForStorage.name = null;
									}

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
							} catch (_error) {
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

							router.push(`/s/${storeId}/reservation/history`);
						}
					} else {
						// Fallback: show success message even if no RSVP data
						toastSuccess({
							description: t("reservation_created"),
						});
						router.push(`/s/${storeId}/reservation/history`);
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

	const handleSendMessage = useCallback(async () => {
		if (!isEditMode || !rsvp?.id) {
			return;
		}

		const message = (form.getValues("message") || "").trim();
		if (!message) {
			toastError({
				title: t("Error"),
				description: t("rsvp_message_required") || "Message is required",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await sendReservationMessageAction({
				id: rsvp.id,
				message,
			});

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
				return;
			}

			toastSuccess({
				description: t("message_sent") || "Message sent",
			});
			const optimisticId =
				typeof globalThis.crypto !== "undefined" &&
				"randomUUID" in globalThis.crypto
					? `opt-${globalThis.crypto.randomUUID()}`
					: `opt-${Date.now()}`;
			setOptimisticConversationMessages((prev) => [
				...prev,
				{
					id: optimisticId,
					senderType: "customer",
					message,
					createdAtMs: Date.now(),
				},
			]);
			form.setValue("message", "");
		} catch (error) {
			toastError({
				title: t("Error"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [form, isEditMode, rsvp?.id, t]);

	const formContent = (
		<div className="relative">
			{/* Block entire form with overlay until submit completes */}
			{isSubmitting && (
				<div
					className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-hidden="true"
				>
					<div className="flex flex-col items-center gap-3">
						<Loader />
						<span className="text-sm font-medium text-muted-foreground">
							{isEditMode ? t("updating") : t("submitting")}
						</span>
					</div>
				</div>
			)}
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					{!isEditMode && reservationBlockedBySignIn ? (
						<Alert className="mb-0" variant="destructive">
							<AlertTitle>
								{t("rsvp_please_sign_in") || "Sign in required"}
							</AlertTitle>
							<AlertDescription className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<span className="text-sm">
									{t("please_sign_in_to_make_reservation") ||
										"Sign in to book at this store."}
								</span>
								<Button
									type="button"
									size="sm"
									className="touch-manipulation"
									asChild
								>
									<Link href={signInHref}>{t("user_profile_sign_in")}</Link>
								</Button>
							</AlertDescription>
						</Alert>
					) : null}
					{reservationInstructionsText ? (
						<section
							className="rounded-lg border border-border bg-muted/40 p-3 text-sm"
							aria-label={t("rsvp_reservation_instructions_heading")}
						>
							<h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{t("rsvp_reservation_instructions_heading")}
							</h2>
							<ProductDescriptionContent
								content={reservationInstructionsText}
								className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_p]:mb-2 [&_p:last-child]:mb-0"
							/>
						</section>
					) : null}
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
										{isEditMode && !isTimeLockedByConfirmation ? (
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
													storeUseBusinessHours={storeUseBusinessHours}
													storeTimezone={storeTimezone}
													currentRsvpId={rsvp?.id || ""}
													selectedDateTime={
														field.value
															? isDateValue(field.value)
																? field.value
																: new Date(field.value)
															: null
													}
													facilityId={isRestaurantMode ? null : facilityId}
													serviceStaffId={
														isRestaurantMode ? null : serviceStaffId
													}
													facilities={facilities}
													onSlotSelect={(dateTime) => {
														// dateTime is already a UTC Date object from convertStoreTimezoneToUtc
														// No need for additional conversion
														if (!dateTime) {
															field.onChange(null);
															return;
														}

														// Validate the date
														if (Number.isNaN(dateTime.getTime())) {
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
															const utcDate = isDateValue(field.value)
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
									{isEditMode && isTimeLockedByConfirmation ? (
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("rsvp_time_locked_after_confirmation") ||
												"Time is locked after both store and customer confirmations."}
										</FormDescription>
									) : null}
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

					{/* Facility Selection - hidden in RESTAURANT mode */}
					{!isRestaurantMode &&
						(mustSelectFacility ||
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
												{effectiveMustSelectFacility &&
													availableFacilities.length > 0 && (
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
											{selectedFacility &&
												facilityCost !== null &&
												facilityCost !== undefined && (
													<div className="text-sm text-muted-foreground">
														{t("rsvp_facility_cost")}: {(() => {
															const formatter = new Intl.NumberFormat("en-US", {
																style: "currency",
																currency: storeCurrency.toUpperCase(),
																maximumFractionDigits: 2,
																minimumFractionDigits: 2,
															});
															return formatter.format(facilityCost);
														})()}
														{isPricingLoading && (
															<span className="ml-2 text-xs text-muted-foreground">
																({t("calculating") || "Calculating..."})
															</span>
														)}
													</div>
												)}
											{availableFacilities.length === 0 &&
												effectiveMustSelectFacility && (
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

					{/* Service Staff Selection - hidden in RESTAURANT mode */}
					{!isRestaurantMode &&
						(mustHaveServiceStaff ||
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
												{!effectiveMustHaveServiceStaff && (
													<span className="font-normal text-muted-foreground">
														{" "}
														({t("optional") || "Optional"})
													</span>
												)}
												{effectiveMustHaveServiceStaff && (
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
												serviceStaffCost !== null &&
												serviceStaffCost !== undefined &&
												serviceStaffCost > 0 && (
													<div className="text-sm text-muted-foreground">
														{t("rsvp_service_staff_cost") ||
															"Service Staff Cost"}
														: {(() => {
															const formatter = new Intl.NumberFormat("en-US", {
																style: "currency",
																currency: storeCurrency.toUpperCase(),
																maximumFractionDigits: 2,
																minimumFractionDigits: 2,
															});
															return formatter.format(serviceStaffCost);
														})()}
														{isPricingLoading && (
															<span className="ml-2 text-xs text-muted-foreground">
																({t("calculating") || "Calculating..."})
															</span>
														)}
													</div>
												)}
											{availableServiceStaff.length === 0 &&
												effectiveMustHaveServiceStaff && (
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

					{/* Contact: anonymous; or signed-in when store requires name/phone and profile is missing them */}
					{(isEditMode ||
						isAnonymousUser ||
						mustCollectNameForSignedIn ||
						mustCollectPhoneForSignedIn) && (
						<div className="space-y-4">
							{(isEditMode ||
								isAnonymousUser ||
								mustCollectNameForSignedIn) && (
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
													value={field.value ?? ""}
													onChange={(e) => {
														const value = e.target.value;
														field.onChange(value);
														if (isAnonymousUser) {
															saveContactInfo(
																value,
																form.getValues("phone") ?? undefined,
															);
														}
														if (fieldState.error) {
															form.clearErrors("name");
														}
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
							)}

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
											saveContactInfo(form.getValues("name") ?? undefined, "");
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
										saveContactInfo(
											form.getValues("name") ?? undefined,
											fullPhoneNumber,
										);

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
												{t("phone")} <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<div className="flex gap-2">
													<PhoneCountryCodeSelector
														value={phoneCountryCode}
														onValueChange={(newCode) => {
															setPhoneCountryCode(newCode);
															// Save country code to local storage
															saveContactInfo(
																form.getValues("name") ?? undefined,
																form.getValues("phone") ?? undefined,
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
															const cleaned = e.target.value.replace(/\D/g, "");
															// Allow 10 digits for both +1 and +886 (Taiwan can be 9 or 10)
															const maxLen =
																phoneCountryCode === "+886" ? 10 : 10;
															const limited = cleaned.slice(0, maxLen);
															updateFullPhone(phoneCountryCode, limited);
															// Save to local storage after updating
															const fullPhone = `${phoneCountryCode}${limited}`;
															saveContactInfo(
																form.getValues("name") ?? undefined,
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

					{!isEditMode && (
						<RsvpMessageFormField
							control={form.control}
							isEditMode={isEditMode}
							isSubmitting={isSubmitting}
							rsvpConversationThread={rsvpConversationThread}
							storeTimezone={storeTimezone}
							t={t}
						/>
					)}

					<Separator />

					{/* Pricing Summary - Show when facility or service staff is selected and total cost > 0 */}
					{(facilityId || serviceStaffId) && totalCost > 0 && (
						<RsvpPricingSummary
							facilityId={facilityId}
							facilityCost={facilityCost}
							serviceStaffId={serviceStaffId}
							serviceStaffCost={serviceStaffCost}
							totalCost={totalCost}
							storeCurrency={storeCurrency}
							isPricingLoading={isPricingLoading}
							discountAmount={
								pricingData?.details?.crossDiscount?.totalDiscountAmount
							}
							alreadyPaid={isEditMode ? (rsvp?.alreadyPaid ?? false) : false}
						/>
					)}

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

						{isEditMode && editLockedByCancelHours ? (
							<Alert className="mt-2" variant="destructive">
								<AlertTitle>
									{t("rsvp_edit_locked") || "Edit locked"}
								</AlertTitle>
								<AlertDescription>{editLockMessage}</AlertDescription>
							</Alert>
						) : null}
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
										(isEditMode && editLockedByCancelHours) ||
										!canCreateReservation ||
										!form.formState.isValid ||
										(!isEditMode && reservationBlockedBySignIn) ||
										(!isEditMode &&
											mustCollectNameForSignedIn &&
											!(form.watch("name") as string | undefined)?.trim()) ||
										(!isEditMode &&
											mustCollectPhoneForSignedIn &&
											!(form.watch("phone") as string | undefined)?.trim())
									}
									className="w-full disabled:opacity-25"
									autoFocus
								>
									{isSubmitting
										? isEditMode
											? t("updating")
											: t("submitting")
										: isEditMode
											? t("modify") || "修改"
											: t("create_reservation")}
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

					{isEditMode && (
						<>
							<Separator className="my-2" />
							<RsvpMessageFormField
								control={form.control}
								isEditMode={isEditMode}
								isSubmitting={isSubmitting}
								rsvpConversationThread={rsvpConversationThread}
								storeTimezone={storeTimezone}
								t={t}
							/>
						</>
					)}

					{isEditMode ? (
						<Button
							type="button"
							variant="outline"
							onClick={handleSendMessage}
							disabled={isSubmitting}
							className="w-full"
						>
							{t("send_message") || "送出訊息"}
						</Button>
					) : null}

					{!isEditMode && !acceptReservation && (
						<p className="text-sm text-destructive text-center">
							{t("rsvp_not_currently_accepted")}
						</p>
					)}
				</form>
			</Form>
		</div>
	);

	if (hideCard) {
		return formContent;
	}

	if (isSubmitting) {
		return <Loader />;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<IconCalendarCheck className="h-5 w-5" />
					{isEditMode ? t("edit_reservation") : t("create_reservation")}
				</CardTitle>
				<CardDescription>
					{isEditMode
						? t("edit_reservation_description")
						: t("create_reservation_description")}
				</CardDescription>
			</CardHeader>
			<CardContent>{formContent}</CardContent>
		</Card>
	);
}

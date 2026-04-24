"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendar, IconClock, IconX } from "@tabler/icons-react";
import { addDays, addMinutes, format, isSameDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { zhTW } from "date-fns/locale/zh-TW";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { ClipLoader } from "react-spinners";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";
import { createReservationAction } from "@/actions/store/reservation/create-reservation";
import {
	type CreateReservationInput,
	createReservationSchema,
} from "@/actions/store/reservation/create-reservation.validation";
import { getServiceStaffAction } from "@/actions/store/reservation/get-service-staff";
import { useTranslation } from "@/app/i18n/client";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { PhoneCountryCodeSelector } from "@/components/auth/phone-country-code-selector";
import { ServiceStaffCombobox } from "@/components/combobox-service-staff";
import { RsvpCalendarExportButtons } from "@/components/rsvp-calendar-export-buttons";
import { ProductDescriptionContent } from "@/components/shop/product-description-content";
import { RsvpCancelPolicyInfo } from "@/components/rsvp-cancel-policy-info";
import { RsvpPricingSummary } from "@/components/rsvp-pricing-summary";
import { toastError, toastSuccess } from "@/components/toaster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { clientLogger } from "@/lib/client-logger";
import { getEffectiveFacilityBusinessHoursJson } from "@/lib/facility/get-effective-facility-business-hours";
import { validatePhoneNumber } from "@/utils/phone-utils";
import { cn } from "@/lib/utils";
import { useResolvedCustomerStoreBasePath } from "@/providers/customer-store-base-path";
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
	addHours,
	dayAndTimeSlotToUtc,
	epochToDate,
	getDateInTz,
	getOffsetHours,
	getUtcNow,
} from "@/utils/datetime-utils";
import { formatStoreCalendarLocation } from "@/utils/format-store-calendar-location";
import { calculateCancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";
import { sumOverlappingPartyHeadcount } from "@/utils/rsvp-restaurant-capacity-utils";
import {
	checkTimeAgainstBusinessHours,
	effectiveRsvpSlotDurationMinutes,
	transformReservationForStorage,
} from "@/utils/rsvp-utils";
import { FacilityReservationCalendar } from "./facility-reservation-calendar";
import { FacilityReservationTimeSlots } from "./facility-reservation-time-slots";

export interface ReservationFlowClientProps {
	storeId: string;
	facility: StoreFacility;
	existingReservations: Rsvp[];
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings | null;
	user: User | null;
	storeTimezone: string;
	storeCurrency: string;
	storeUseBusinessHours: boolean;
	isBlacklisted: boolean;
	useCustomerCredit: boolean;
	creditExchangeRate: number | null;
	creditServiceExchangeRate: number | null;
	/** Restaurant / open booking: submit without facility; use store-wide capacity. */
	omitFacilityOnSubmit?: boolean;
	/** Page title when omitFacilityOnSubmit (e.g. store name). */
	storeLabelForHeader?: string;
	/** Staff-mode booking from `/reservation/service-staff/[id]`: lock selection to this staff member. */
	prefilledServiceStaffId?: string | null;
	/** When personnel mode + mustSelectFacility, facilities the customer can choose (service-staff page). */
	facilitiesForPersonnelPicker?: StoreFacility[];
}

/** Shared reservation UI; use mode-specific wrappers (facility / restaurant / personnel). */
export function ReservationFlowClient({
	storeId,
	facility,
	existingReservations,
	rsvpSettings,
	storeSettings,
	user,
	storeTimezone,
	storeCurrency,
	storeUseBusinessHours,
	isBlacklisted,
	useCustomerCredit,
	creditExchangeRate,
	creditServiceExchangeRate,
	omitFacilityOnSubmit = false,
	storeLabelForHeader,
	prefilledServiceStaffId = null,
	facilitiesForPersonnelPicker = [],
}: ReservationFlowClientProps) {
	const _params = useParams<{ storeId: string }>();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const customerBase = useResolvedCustomerStoreBasePath(facility.storeId);
	const omitFacility = omitFacilityOnSubmit === true;
	const rsvpMode = Number(rsvpSettings?.rsvpMode ?? RsvpMode.FACILITY);
	const mustSelectFacility = rsvpSettings?.mustSelectFacility ?? false;
	const reservationInstructionsText = useMemo(
		() => (rsvpSettings?.reservationInstructions?.trim() ?? "") || "",
		[rsvpSettings?.reservationInstructions],
	);
	const needsPersonnelFacilityPicker =
		omitFacility &&
		Boolean(prefilledServiceStaffId) &&
		rsvpMode === RsvpMode.PERSONNEL &&
		mustSelectFacility;

	const [personnelBookingFacilityId, setPersonnelBookingFacilityId] = useState<
		string | null
	>(null);

	const slotFacility = useMemo(() => {
		if (
			needsPersonnelFacilityPicker &&
			personnelBookingFacilityId &&
			facilitiesForPersonnelPicker.length > 0
		) {
			return (
				facilitiesForPersonnelPicker.find(
					(f) => f.id === personnelBookingFacilityId,
				) ?? facility
			);
		}
		return facility;
	}, [
		needsPersonnelFacilityPicker,
		personnelBookingFacilityId,
		facilitiesForPersonnelPicker,
		facility,
	]);

	const pricingFacilityId = useMemo(() => {
		if (needsPersonnelFacilityPicker) {
			return personnelBookingFacilityId;
		}
		if (omitFacility || rsvpMode === RsvpMode.PERSONNEL) {
			return null;
		}
		return facility.id;
	}, [
		needsPersonnelFacilityPicker,
		personnelBookingFacilityId,
		omitFacility,
		rsvpMode,
		facility.id,
	]);

	// Get date-fns locale based on user's language
	const dateLocale = useMemo(() => {
		switch (lng) {
			case "tw":
				return zhTW;
			case "jp":
				return ja;
			default:
				return enUS;
		}
	}, [lng]);

	// State management
	// Initialize selectedDate to null, will be set by useEffect after checking availability
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTime, setSelectedTime] = useState<string | null>(null);
	const [numOfAdult, setNumOfAdult] = useState(1);
	const [numOfChild, setNumOfChild] = useState(0);
	const [serviceStaffId, setServiceStaffId] = useState<string | null>(
		() => prefilledServiceStaffId ?? null,
	);
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [createdRsvpForCalendar, setCreatedRsvpForCalendar] =
		useState<Rsvp | null>(null);
	const submitButtonRef = useRef<HTMLButtonElement>(null);

	const calendarLocation = useMemo(
		() => formatStoreCalendarLocation(storeSettings),
		[storeSettings],
	);

	// Helper function to check if user is anonymous (guest user)
	const isAnonymousUser = useMemo(() => {
		if (!user) return true; // No user = anonymous
		// Check if user email matches guest pattern (guest-{id}@riben.life)
		return (
			user.email?.startsWith("guest-") && user.email.endsWith("@riben.life")
		);
	}, [user]);

	const userProfilePhone = useMemo(
		() => String(user?.phoneNumber ?? "").trim(),
		[user?.phoneNumber],
	);

	const mustCollectPhoneForSignedIn = useMemo(
		() =>
			!isAnonymousUser &&
			Boolean(rsvpSettings?.requirePhone) &&
			!userProfilePhone,
		[isAnonymousUser, rsvpSettings?.requirePhone, userProfilePhone],
	);

	// Initialize phoneCountryCode from localStorage (same keys as FormPhoneOtpInner)
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

	// Initialize saved contact info from localStorage (only for anonymous users)
	// Same pattern as reservation-form.tsx
	const [savedContactInfo, setSavedContactInfo] = useState<{
		name?: string;
	} | null>(() => {
		if (typeof window !== "undefined" && isAnonymousUser && storeId) {
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

	// Initialize customerName: use user name if logged in, otherwise use saved contact info
	const [customerName, setCustomerName] = useState(() => {
		if (user?.name) {
			return user.name;
		}
		if (isAnonymousUser && savedContactInfo?.name) {
			if (savedContactInfo.name.trim().toLowerCase() === "anonymous") {
				return "";
			}

			return savedContactInfo.name;
		}
		return "";
	});

	// Initialize customerPhoneLocal: use user phone if logged in, otherwise use localStorage
	const [customerPhoneLocal, setCustomerPhoneLocal] = useState(() => {
		if (user?.phoneNumber) {
			// Extract local number from full phone
			const match = user.phoneNumber.match(/^\+\d{1,3}(.+)$/);
			if (match) {
				let localNumber = match[1];
				// For Taiwan, ensure we handle leading 0 correctly
				if (phoneCountryCode === "+886" && !localNumber.startsWith("0")) {
					// Check if it should have leading 0 (9 digits -> 09XXXXXXXX)
					if (localNumber.length === 9) {
						localNumber = `0${localNumber}`;
					}
				}
				return localNumber;
			}
		}
		if (typeof window !== "undefined") {
			const savedPhoneNumber = localStorage.getItem("phone_local_number");
			if (savedPhoneNumber) {
				let localNumber = savedPhoneNumber;
				// For Taiwan, ensure we handle leading 0 correctly
				if (phoneCountryCode === "+886" && !localNumber.startsWith("0")) {
					// Check if it should have leading 0 (9 digits -> 09XXXXXXXX)
					if (localNumber.length === 9) {
						localNumber = `0${localNumber}`;
					}
				}
				return localNumber;
			}
		}
		return "";
	});

	// Save contact info to local storage when name or phone changes (same pattern as reservation-form.tsx)
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

	// Focus submit button on mount for keyboard/accessibility
	useEffect(() => {
		submitButtonRef.current?.focus();
	}, []);

	// Sync customerName from user when logged in (so we always show profile name)
	useEffect(() => {
		if (user?.name) {
			setCustomerName(user.name);
		}
	}, [user?.name]);

	// Update customerName when savedContactInfo loads (for anonymous users; never use "anonymous")
	useEffect(() => {
		if (
			isAnonymousUser &&
			savedContactInfo?.name &&
			!customerName &&
			savedContactInfo.name.trim().toLowerCase() !== "anonymous"
		) {
			setCustomerName(savedContactInfo.name);
		}
	}, [isAnonymousUser, savedContactInfo, customerName]);

	// Calendar state
	const [currentMonth, setCurrentMonth] = useState(() => {
		const now = getUtcNow();
		return getDateInTz(now, getOffsetHours(storeTimezone));
	});

	useEffect(() => {
		if (needsPersonnelFacilityPicker) {
			setSelectedTime(null);
		}
	}, [needsPersonnelFacilityPicker, personnelBookingFacilityId]);

	// Helper function to generate time slots (same logic as FacilityReservationTimeSlots)
	const generateTimeSlotsForDate = useCallback(
		(date: Date): string[] => {
			if (needsPersonnelFacilityPicker && !personnelBookingFacilityId) {
				return [];
			}

			const slotStepMinutes = effectiveRsvpSlotDurationMinutes(
				rsvpSettings,
				slotFacility,
			);

			const hoursJson = getEffectiveFacilityBusinessHoursJson(
				slotFacility,
				rsvpSettings,
				storeUseBusinessHours,
				storeSettings?.businessHours ?? null,
			);
			let allSlots: string[] = [];

			if (!hoursJson) {
				for (let t = 8 * 60; t < 22 * 60; t += slotStepMinutes) {
					const h = Math.floor(t / 60);
					const m = t % 60;
					allSlots.push(
						`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
					);
				}
			} else {
				try {
					interface TimeRange {
						from: string;
						to: string;
					}

					interface WeeklySchedule {
						Monday?: TimeRange[] | "closed";
						Tuesday?: TimeRange[] | "closed";
						Wednesday?: TimeRange[] | "closed";
						Thursday?: TimeRange[] | "closed";
						Friday?: TimeRange[] | "closed";
						Saturday?: TimeRange[] | "closed";
						Sunday?: TimeRange[] | "closed";
					}

					const schedule = JSON.parse(hoursJson) as WeeklySchedule;
					const slots = new Set<string>();

					const dayNames = [
						"Sunday",
						"Monday",
						"Tuesday",
						"Wednesday",
						"Thursday",
						"Friday",
						"Saturday",
					] as const;

					// Get day of week (0 = Sunday, 6 = Saturday)
					const dayOfWeek = date.getDay();
					const dayName = dayNames[dayOfWeek];
					const dayHours = schedule[dayName];

					if (dayHours !== "closed" && Array.isArray(dayHours)) {
						dayHours.forEach((range: TimeRange) => {
							const [fromHour, fromMin] = range.from.split(":").map(Number);
							const [toHour, toMin] = range.to.split(":").map(Number);

							let currentHour = fromHour;
							let currentMin = fromMin;

							while (
								currentHour < toHour ||
								(currentHour === toHour && currentMin < toMin)
							) {
								const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;
								slots.add(timeStr);

								// Increment by RSVP default duration (slot step, in minutes)
								currentMin += slotStepMinutes;
								if (currentMin >= 60) {
									currentHour += Math.floor(currentMin / 60);
									currentMin = currentMin % 60;
								}
							}
						});
					}

					allSlots = Array.from(slots).sort();
				} catch {
					for (let t = 8 * 60; t < 22 * 60; t += slotStepMinutes) {
						const h = Math.floor(t / 60);
						const m = t % 60;
						allSlots.push(
							`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
						);
					}
				}
			}

			// Filter out past time slots if selected date is today
			const now = getUtcNow();
			const nowInStoreTz = getDateInTz(now, getOffsetHours(storeTimezone));
			const isToday =
				date.getFullYear() === nowInStoreTz.getFullYear() &&
				date.getMonth() === nowInStoreTz.getMonth() &&
				date.getDate() === nowInStoreTz.getDate();

			let filteredSlots = allSlots;

			if (isToday) {
				// For today, filter out past time slots
				const currentHour = nowInStoreTz.getHours();
				const currentMinute = nowInStoreTz.getMinutes();
				const currentTimeMinutes = currentHour * 60 + currentMinute;

				filteredSlots = allSlots.filter((timeSlot) => {
					const [hours, minutes] = timeSlot.split(":").map(Number);
					const slotTimeMinutes = hours * 60 + minutes;
					// Only show slots that are at least 1 hour in the future
					// (or at least the default duration if it's less than 1 hour)
					const minAdvanceMinutes = Math.min(60, slotStepMinutes);
					return slotTimeMinutes >= currentTimeMinutes + minAdvanceMinutes;
				});
			}

			// Filter out fully booked slots (for all dates)
			const slotFacilityCapacity = slotFacility.capacity || 10;
			const headcount = numOfAdult + numOfChild;
			const restaurantCap = rsvpSettings?.maxCapacity ?? 0;

			const useRestaurantWideCapacity =
				omitFacility &&
				!(needsPersonnelFacilityPicker && personnelBookingFacilityId);

			return filteredSlots.filter((timeSlot) => {
				const slotDateTimeUtc = dayAndTimeSlotToUtc(
					date,
					timeSlot,
					storeTimezone,
				);

				if (hoursJson) {
					const result = checkTimeAgainstBusinessHours(
						hoursJson,
						slotDateTimeUtc,
						storeTimezone,
					);
					if (!result.isValid) {
						return false;
					}
				}

				const slotEndUtc = addMinutes(slotDateTimeUtc, slotStepMinutes);
				const slotStartMs = slotDateTimeUtc.getTime();
				const slotEndMs = slotEndUtc.getTime();

				if (useRestaurantWideCapacity) {
					if (restaurantCap > 0) {
						const occupied = sumOverlappingPartyHeadcount(
							existingReservations,
							slotStartMs,
							slotEndMs,
							slotStepMinutes,
							storeTimezone,
						);
						return occupied + headcount <= restaurantCap;
					}
					return true;
				}

				const overlappingReservations = existingReservations.filter((rsvp) => {
					if (
						rsvp.status === RsvpStatus.Cancelled ||
						rsvp.status === RsvpStatus.NoShow
					) {
						return false;
					}

					if (
						!rsvp.rsvpTime ||
						!rsvp.Facility ||
						rsvp.Facility.id !== slotFacility.id
					) {
						return false;
					}

					const rsvpDateUtc = epochToDate(rsvp.rsvpTime);
					if (!rsvpDateUtc) return false;

					const rsvpDateInStoreTz = getDateInTz(
						rsvpDateUtc,
						getOffsetHours(storeTimezone),
					);
					const slotDateInStoreTz = getDateInTz(
						slotDateTimeUtc,
						getOffsetHours(storeTimezone),
					);
					if (!isSameDay(rsvpDateInStoreTz, slotDateInStoreTz)) {
						return false;
					}

					const rsvpDuration =
						(rsvp.Facility?.defaultDuration != null
							? Number(rsvp.Facility.defaultDuration)
							: slotFacility.defaultDuration != null
								? Number(slotFacility.defaultDuration)
								: null) ?? slotStepMinutes;
					const rsvpEndUtc = addMinutes(rsvpDateUtc, rsvpDuration);

					return (
						(rsvpDateUtc >= slotDateTimeUtc && rsvpDateUtc < slotEndUtc) ||
						(rsvpEndUtc > slotDateTimeUtc && rsvpEndUtc <= slotEndUtc) ||
						(rsvpDateUtc <= slotDateTimeUtc && rsvpEndUtc >= slotEndUtc)
					);
				});

				const totalBooked = overlappingReservations.reduce((sum, rsvp) => {
					return sum + (rsvp.numOfAdult || 0) + (rsvp.numOfChild || 0);
				}, 0);

				return totalBooked < slotFacilityCapacity;
			});
		},
		[
			slotFacility,
			rsvpSettings,
			storeSettings,
			storeUseBusinessHours,
			storeTimezone,
			existingReservations,
			omitFacility,
			needsPersonnelFacilityPicker,
			personnelBookingFacilityId,
			numOfAdult,
			numOfChild,
		],
	);

	// Set default date: first check today for available slots, if none, find next available day
	useEffect(() => {
		if (selectedDate !== null) {
			// Date already selected, skip
			return;
		}

		// Get today in store timezone
		const now = getUtcNow();
		const today = getDateInTz(now, getOffsetHours(storeTimezone));

		// Check if today has available slots
		const todaySlots = generateTimeSlotsForDate(today);
		if (todaySlots.length > 0) {
			// Today has available slots, select today
			setSelectedDate(today);
			return;
		}

		// Today has no available slots, find next available day
		// Check up to 30 days in the future
		let checkDate = today;
		for (let i = 1; i <= 30; i++) {
			checkDate = addDays(today, i);
			const slots = generateTimeSlotsForDate(checkDate);
			if (slots.length > 0) {
				// Found a day with available slots
				setSelectedDate(checkDate);
				return;
			}
		}

		// If no available slots found in 30 days, still select today as fallback
		setSelectedDate(today);
	}, [selectedDate, storeTimezone, generateTimeSlotsForDate]);

	// Set default time to 2 hours later when date is selected (only if no time is selected)
	useEffect(() => {
		if (!selectedDate || selectedTime !== null) {
			// Only set default if no time is already selected
			return;
		}

		// Get current time in store timezone
		const now = getUtcNow();
		const nowInStoreTz = getDateInTz(now, getOffsetHours(storeTimezone));
		const twoHoursLater = addHours(nowInStoreTz, 2);

		// Generate time slots for the selected date
		const timeSlots = generateTimeSlotsForDate(selectedDate);

		// Find the first available slot that is at least 2 hours later
		const targetTimeMinutes =
			twoHoursLater.getHours() * 60 + twoHoursLater.getMinutes();

		const defaultSlot = timeSlots.find((slot) => {
			const [slotHour, slotMin] = slot.split(":").map(Number);
			const slotTimeMinutes = slotHour * 60 + slotMin;
			return slotTimeMinutes >= targetTimeMinutes;
		});

		// If found, set it; otherwise use the first available slot
		if (defaultSlot) {
			setSelectedTime(defaultSlot);
		} else if (timeSlots.length > 0) {
			// If no slot is >= 2 hours later, use the last slot
			setSelectedTime(timeSlots[timeSlots.length - 1]);
		}
	}, [selectedDate, selectedTime, storeTimezone, generateTimeSlotsForDate]);

	// Build rsvpTime from selectedDate + selectedTime for staff availability filter
	const rsvpTimeIso = useMemo(() => {
		if (!selectedDate || !selectedTime || !storeTimezone) return null;
		const rsvpDateUtc = dayAndTimeSlotToUtc(
			selectedDate,
			selectedTime,
			storeTimezone,
		);
		return rsvpDateUtc?.toISOString() ?? null;
	}, [selectedDate, selectedTime, storeTimezone]);

	// Fetch service staff filtered by facility + time (ServiceStaffFacilitySchedule + availability)
	const fetchServiceStaff = useCallback(async () => {
		if (omitFacility && prefilledServiceStaffId) {
			const result = await getServiceStaffAction({
				storeId,
				...(mustSelectFacility && personnelBookingFacilityId
					? { facilityId: personnelBookingFacilityId }
					: {}),
				rsvpTimeIso: rsvpTimeIso ?? undefined,
				storeTimezone: rsvpTimeIso ? storeTimezone : undefined,
				includeStaffIds: [prefilledServiceStaffId],
			});
			return result?.data?.serviceStaff ?? [];
		}
		if (omitFacility) {
			return [];
		}
		const result = await getServiceStaffAction({
			storeId,
			facilityId: rsvpMode === RsvpMode.PERSONNEL ? undefined : facility.id,
			rsvpTimeIso: rsvpTimeIso ?? undefined,
			storeTimezone: rsvpTimeIso ? storeTimezone : undefined,
		});
		return result?.data?.serviceStaff ?? [];
	}, [
		omitFacility,
		prefilledServiceStaffId,
		mustSelectFacility,
		personnelBookingFacilityId,
		rsvpMode,
		storeId,
		facility.id,
		rsvpTimeIso,
		storeTimezone,
	]);

	const serviceStaffSwrKey = useMemo(() => {
		if (omitFacility && prefilledServiceStaffId) {
			return [
				"serviceStaff",
				storeId,
				"prefill",
				prefilledServiceStaffId,
				mustSelectFacility ? (personnelBookingFacilityId ?? "") : "",
				rsvpTimeIso ?? "",
			] as const;
		}
		if (omitFacility) {
			return null;
		}
		return [
			"serviceStaff",
			storeId,
			facility.id,
			rsvpMode,
			rsvpTimeIso ?? "",
		] as const;
	}, [
		omitFacility,
		prefilledServiceStaffId,
		mustSelectFacility,
		personnelBookingFacilityId,
		storeId,
		facility.id,
		rsvpMode,
		rsvpTimeIso,
	]);

	const { data: serviceStaffData } = useSWR(
		serviceStaffSwrKey,
		fetchServiceStaff,
	);
	const allServiceStaff: ServiceStaffColumn[] = serviceStaffData ?? [];

	// Service staff list is already filtered by facility via action
	const serviceStaff = allServiceStaff;

	const prefilledStaffDisplayName = useMemo(() => {
		if (!prefilledServiceStaffId) {
			return null;
		}
		const fromList = serviceStaff.find((s) => s.id === prefilledServiceStaffId);
		return fromList?.userName || fromList?.userEmail || prefilledServiceStaffId;
	}, [prefilledServiceStaffId, serviceStaff]);

	// Clear selected service staff if it's no longer available
	useEffect(() => {
		if (prefilledServiceStaffId) {
			return;
		}
		if (serviceStaffId) {
			const isStillAvailable = serviceStaff.some(
				(staff) => staff.id === serviceStaffId,
			);
			if (!isStillAvailable) {
				setServiceStaffId(null);
			}
		}
	}, [serviceStaffId, serviceStaff, prefilledServiceStaffId]);

	const facilityCapacity =
		omitFacility && !needsPersonnelFacilityPicker
			? rsvpSettings?.maxCapacity && rsvpSettings.maxCapacity > 0
				? rsvpSettings.maxCapacity
				: 50
			: slotFacility.capacity || 10;
	const maxAdults = Math.max(1, facilityCapacity);
	const maxChildren = Math.max(0, facilityCapacity - numOfAdult);

	// Validate total party size against facility capacity
	const totalPartySize = numOfAdult + numOfChild;
	const exceedsCapacity = totalPartySize > facilityCapacity;
	const remainingCapacity = Math.max(0, facilityCapacity - totalPartySize);

	// Auto-adjust children if adults selection would exceed capacity
	useEffect(() => {
		if (numOfAdult > facilityCapacity) {
			setNumOfAdult(facilityCapacity);
			setNumOfChild(0);
		} else if (totalPartySize > facilityCapacity) {
			// If total exceeds capacity, reduce children to fit
			const maxAllowedChildren = Math.max(0, facilityCapacity - numOfAdult);
			if (numOfChild > maxAllowedChildren) {
				setNumOfChild(maxAllowedChildren);
			}
		}
	}, [numOfAdult, numOfChild, facilityCapacity, totalPartySize]);

	// Form setup
	// Build full phone number from country code and local number
	const customerPhone = useMemo(() => {
		if (!customerPhoneLocal) return "";
		// Remove leading 0 for Taiwan if present (will be added back if needed)
		let local = customerPhoneLocal;
		if (phoneCountryCode === "+886" && local.startsWith("0")) {
			local = local.substring(1);
		}
		return `${phoneCountryCode}${local}`;
	}, [phoneCountryCode, customerPhoneLocal]);

	// Never use "anonymous" as customer name (for payload and form)
	const anonymousNameValue =
		isAnonymousUser &&
		customerName?.trim() &&
		customerName.trim().toLowerCase() !== "anonymous"
			? customerName
			: undefined;

	const defaultValues: CreateReservationInput = useMemo(
		() => ({
			storeId,
			customerId: user?.id || null,
			// Only include name and phone for anonymous users (never send "anonymous" as name)
			name: anonymousNameValue,
			phone:
				isAnonymousUser || mustCollectPhoneForSignedIn
					? customerPhone
					: undefined,
			facilityId: pricingFacilityId,
			serviceStaffId: null,
			numOfAdult: 1,
			numOfChild: 0,
			rsvpTime: new Date(),
			message: "",
		}),
		[
			storeId,
			user,
			pricingFacilityId,
			anonymousNameValue,
			customerPhone,
			isAnonymousUser,
			mustCollectPhoneForSignedIn,
		],
	);

	const form = useForm<CreateReservationInput>({
		resolver: zodResolver(
			createReservationSchema,
		) as Resolver<CreateReservationInput>,
		defaultValues,
		mode: "onChange",
	});

	// Update form when state changes
	useEffect(() => {
		if (selectedDate && selectedTime) {
			// Convert date and time slot to UTC Date using store timezone (server independent)
			const utcDate = dayAndTimeSlotToUtc(
				selectedDate,
				selectedTime,
				storeTimezone,
			);

			form.setValue("rsvpTime", utcDate);
		}
		form.setValue("facilityId", pricingFacilityId);
		form.setValue("numOfAdult", numOfAdult);
		form.setValue("numOfChild", numOfChild);
		form.setValue("serviceStaffId", serviceStaffId);
		form.setValue("message", message);
		// Set name/phone for anonymous; phone only for signed-in when store requires a number not on profile
		if (isAnonymousUser) {
			form.setValue("name", anonymousNameValue ?? "");
		} else {
			form.setValue("name", undefined);
		}
		if (isAnonymousUser || mustCollectPhoneForSignedIn) {
			form.setValue("phone", customerPhone);
		} else {
			form.setValue("phone", undefined);
		}
	}, [
		selectedDate,
		selectedTime,
		numOfAdult,
		numOfChild,
		serviceStaffId,
		message,
		anonymousNameValue,
		customerPhone,
		slotFacility.id,
		pricingFacilityId,
		storeTimezone,
		form,
		isAnonymousUser,
		mustCollectPhoneForSignedIn,
	]);

	// Calculate pricing
	const [debouncedRsvpTime] = useDebounceValue(
		selectedDate && selectedTime
			? dayAndTimeSlotToUtc(selectedDate, selectedTime, storeTimezone)
			: null,
		500,
	);

	// Stable key for pricing SWR (Date -> ISO string avoids reference churn)
	const pricingKey = useMemo(() => {
		if (!debouncedRsvpTime) return null;
		const rsvpIso =
			debouncedRsvpTime instanceof Date
				? debouncedRsvpTime.toISOString()
				: String(debouncedRsvpTime);
		return [
			"/api/store",
			storeId,
			"facilities",
			"calculate-pricing",
			rsvpIso,
			pricingFacilityId,
			serviceStaffId,
		] as const;
	}, [
		storeId,
		slotFacility.id,
		pricingFacilityId,
		debouncedRsvpTime,
		serviceStaffId,
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
						facilityId: pricingFacilityId,
						serviceStaffId: serviceStaffId || null,
						rsvpTime: debouncedRsvpTime.toISOString(),
					}),
				},
			);

			if (!res.ok) throw new Error("Failed to calculate price");
			return res.json();
		},
	);

	const facilityCost = useMemo(() => {
		if (pricingData?.details?.facility?.discountedCost !== undefined) {
			return pricingData.details.facility.discountedCost;
		}
		if (slotFacility.defaultCost) {
			return typeof slotFacility.defaultCost === "number"
				? slotFacility.defaultCost
				: Number(slotFacility.defaultCost);
		}
		return null;
	}, [slotFacility, pricingData]);

	const serviceStaffCost = useMemo(() => {
		if (pricingData?.details?.serviceStaff?.discountedCost !== undefined) {
			return pricingData.details.serviceStaff.discountedCost;
		}
		return null;
	}, [pricingData]);

	const totalCost = useMemo(() => {
		if (pricingData && typeof pricingData.totalCost === "number") {
			return pricingData.totalCost;
		}
		const facility = facilityCost ?? 0;
		const staff = serviceStaffCost ?? 0;
		return facility + staff;
	}, [pricingData, facilityCost, serviceStaffCost]);

	// Calculate if prepaid is required
	const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;
	const prepaidRequired = (minPrepaidPercentage ?? 0) > 0 && totalCost > 0;

	// Calculate cancel policy info
	const cancelPolicyInfo = useMemo(() => {
		if (!selectedDate || !selectedTime) return null;

		// Convert date and time slot to UTC Date using store timezone (server independent)
		const rsvpTime = dayAndTimeSlotToUtc(
			selectedDate,
			selectedTime,
			storeTimezone,
		);

		return calculateCancelPolicyInfo(
			rsvpSettings,
			rsvpTime,
			false, // alreadyPaid
		);
	}, [selectedDate, selectedTime, storeTimezone, rsvpSettings]);

	// Handle form submission
	const handleSubmit = useCallback(async () => {
		if (!selectedDate || !selectedTime) {
			toastError({
				title: t("error_title") || "Error",
				description:
					`${t("rsvp_time")} ${t("required") || "is required"}` ||
					"Please select a date and time",
			});
			return;
		}

		if (needsPersonnelFacilityPicker && !personnelBookingFacilityId) {
			toastError({
				title: t("error_title") || "Error",
				description: t("rsvp_facility_required") || "Please select a facility",
			});
			return;
		}

		// Validate anonymous user fields
		if (isAnonymousUser) {
			const nameTrimmed = customerName?.trim() ?? "";
			if (!nameTrimmed) {
				toastError({
					title: t("error_title") || "Error",
					description:
						t("rsvp_name_required_for_anonymous") || "Name is required",
				});
				return;
			}
			// Never accept "anonymous" as the customer name
			if (nameTrimmed.toLowerCase() === "anonymous") {
				toastError({
					title: t("error_title") || "Error",
					description:
						t("rsvp_name_required_for_anonymous") || "Name is required",
				});
				return;
			}
			if (!customerPhoneLocal || customerPhoneLocal.trim() === "") {
				toastError({
					title: t("error_title") || "Error",
					description:
						t("rsvp_phone_required_for_anonymous") || "Phone is required",
				});
				return;
			}
		}

		if (mustCollectPhoneForSignedIn) {
			if (!customerPhoneLocal || customerPhoneLocal.trim() === "") {
				toastError({
					title: t("error_title") || "Error",
					description: t("rsvp_phone_required") || "Phone is required",
				});
				return;
			}
			if (!validatePhoneNumber(customerPhone)) {
				toastError({
					title: t("error_title") || "Error",
					description:
						t("phone_number_invalid_format") || "Invalid phone number",
				});
				return;
			}
		}

		// Validate form
		const isValid = await form.trigger();
		if (!isValid) {
			const errors = form.formState.errors;
			const firstError = Object.values(errors)[0];
			if (firstError) {
				toastError({
					title: t("error_title") || "Error",
					description: firstError.message as string,
				});
			}
			return;
		}

		setIsSubmitting(true);
		try {
			const formData = form.getValues();
			const result = await createReservationAction(formData);

			if (result?.serverError) {
				toastError({
					title: t("error_title") || "Error",
					description: result.serverError,
				});
				return;
			}

			if (result?.data) {
				const data = result.data as {
					rsvp: Rsvp;
					orderId?: string | null;
				};
				const orderId = data.orderId;

				// Create anonymous user session only when no session exists
				// Skip if user already exists (including existing anonymous/guest users)
				if (!user) {
					try {
						const anonymousSignInResult = await authClient.signIn.anonymous();
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
							clientLogger.error("Failed to create anonymous user session", {
								metadata: {
									error: anonymousSignInResult.error.message,
									rsvpId: data.rsvp.id,
									storeId,
								},
								tags: ["reservation", "anonymous", "error"],
							});
							// Continue even if anonymous session creation fails
						}
					} catch (error) {
						clientLogger.error("Error creating anonymous user session", {
							metadata: {
								error: error instanceof Error ? error.message : String(error),
								rsvpId: data.rsvp.id,
								storeId,
							},
							tags: ["reservation", "anonymous", "error"],
						});
						// Continue even if anonymous session creation fails
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
							const nameTrimmed = customerName?.trim() ?? "";
							if (nameTrimmed && nameTrimmed.toLowerCase() !== "anonymous") {
								reservationForStorage.name = nameTrimmed;
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
				} else {
					// No prepaid required: show success message (customer stays on page)
					setCreatedRsvpForCalendar(data.rsvp);
					toastSuccess({
						title: t("success_title") || "Success",
						description:
							t("reservation_created") || "Reservation created successfully",
					});
				}
			}
		} catch (error) {
			toastError({
				title: t("error_title") || "Error",
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [
		selectedDate,
		selectedTime,
		needsPersonnelFacilityPicker,
		personnelBookingFacilityId,
		isAnonymousUser,
		mustCollectPhoneForSignedIn,
		customerName,
		customerPhone,
		customerPhoneLocal,
		form,
		t,
		router,
		prepaidRequired,
		storeId,
		totalCost,
		user,
	]);

	// Handle close
	const handleClose = useCallback(() => {
		router.back();
	}, [router]);

	return (
		<div
			className="relative min-h-screen bg-background"
			aria-busy={isSubmitting}
			aria-disabled={isSubmitting}
		>
			{/* Overlay loader: lock UI and show loader during submission */}
			{isSubmitting && (
				<div
					className="absolute inset-0 z-[100] flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
					aria-live="polite"
					aria-label={t("submitting")}
				>
					<div className="flex flex-col items-center gap-3">
						<ClipLoader size={40} color="#3498db" />
						<span className="text-sm font-medium text-muted-foreground">
							{t("submitting")}
						</span>
					</div>
				</div>
			)}
			{/* Header */}
			<div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-3 py-3 sm:px-4 lg:px-6">
				<h1 className="text-lg font-semibold sm:text-xl">
					{storeLabelForHeader ?? facility.facilityName}
				</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleClose}
					disabled={isSubmitting}
					className="h-11 w-11 sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0 touch-manipulation"
				>
					<IconX className="h-5 w-5" />
				</Button>
			</div>

			<div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
				{reservationInstructionsText ? (
					<section
						className="mb-4 rounded-lg border border-border bg-muted/40 p-3 text-sm sm:p-4"
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
				{createdRsvpForCalendar ? (
					<Alert className="mb-4 border-primary/30 bg-primary/5">
						<IconCalendar className="h-4 w-4" />
						<AlertTitle className="text-sm sm:text-base">
							{t("reservation_created") || "Reservation created"}
						</AlertTitle>
						<AlertDescription className="mt-2 space-y-3 text-sm">
							<p className="text-muted-foreground">
								{t("rsvp_calendar_export_hint")}
							</p>
							<RsvpCalendarExportButtons
								rsvp={createdRsvpForCalendar}
								storeTimezone={storeTimezone}
								location={calendarLocation}
								googleLabel={t("rsvp_add_to_google_calendar")}
								icsLabel={t("rsvp_download_ics")}
							/>
							<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
									onClick={() => setCreatedRsvpForCalendar(null)}
								>
									{t("close")}
								</Button>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
									asChild
								>
									<Link href={`${customerBase}/reservation/history`}>
										{t("rsvp_history")}
									</Link>
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				) : null}

				{needsPersonnelFacilityPicker &&
					facilitiesForPersonnelPicker.length > 0 && (
						<div className="mb-6">
							<Label className="mb-2 block text-sm font-medium">
								{t("rsvp_select_facility")}
								<span className="text-destructive"> *</span>
							</Label>
							<Select
								value={personnelBookingFacilityId ?? ""}
								onValueChange={(v) =>
									setPersonnelBookingFacilityId(v.length > 0 ? v : null)
								}
								disabled={isSubmitting}
							>
								<SelectTrigger className="h-11 w-full max-w-md touch-manipulation sm:h-10 sm:min-h-0">
									<SelectValue placeholder={t("rsvp_select_facility")} />
								</SelectTrigger>
								<SelectContent>
									{facilitiesForPersonnelPicker.map((f) => (
										<SelectItem key={f.id} value={f.id}>
											{f.facilityName}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

				{/* Date & Party Size Selection - Two Column Layout */}
				<div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
					{/* Left: Calendar */}
					<div>
						<FacilityReservationCalendar
							currentMonth={currentMonth}
							onMonthChange={setCurrentMonth}
							selectedDate={selectedDate}
							onDateSelect={setSelectedDate}
							existingReservations={existingReservations}
							facility={slotFacility}
							rsvpSettings={rsvpSettings}
							storeSettings={storeSettings}
							storeUseBusinessHours={storeUseBusinessHours}
							storeTimezone={storeTimezone}
							dateLocale={dateLocale}
							numOfAdult={numOfAdult}
							numOfChild={numOfChild}
						/>
					</div>

					{/* Right: Party Size Selection */}
					<div className="space-y-4">
						<div>
							<Label className="mb-2 block text-sm font-medium">
								{t("rsvp_num_of_adult") || "Number of Adults"}
							</Label>
							<Select
								value={numOfAdult.toString()}
								onValueChange={(value) =>
									setNumOfAdult(Number.parseInt(value, 10))
								}
							>
								<SelectTrigger
									className={cn(
										"h-11 w-full sm:h-10 sm:min-h-0 touch-manipulation",
										exceedsCapacity &&
											"border-destructive focus-visible:ring-destructive",
									)}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: maxAdults }, (_, i) => i + 1).map(
										(num) => (
											<SelectItem key={num} value={num.toString()}>
												{num}{" "}
												{num === 1
													? t("person") || "person"
													: t("person") || "people"}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="mb-2 block text-sm font-medium">
								{t("rsvp_num_of_child") || "Number of Children"}
							</Label>
							<Select
								value={numOfChild.toString()}
								onValueChange={(value) =>
									setNumOfChild(Number.parseInt(value, 10))
								}
							>
								<SelectTrigger
									className={cn(
										"h-11 w-full sm:h-10 sm:min-h-0 touch-manipulation",
										exceedsCapacity &&
											"border-destructive focus-visible:ring-destructive",
									)}
								>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: maxChildren + 1 }, (_, i) => i).map(
										(num) => (
											<SelectItem key={num} value={num.toString()}>
												{num}{" "}
												{num === 1
													? t("person") || "person"
													: t("person") || "people"}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
							{exceedsCapacity && (
								<p className="mt-1 text-sm text-destructive">
									{(
										t("rsvp_capacity_exceeded") ||
										"Capacity exceeded. Maximum capacity is {{capacity}}. Please reduce the number of people."
									).replace("{{capacity}}", String(facilityCapacity))}
								</p>
							)}
							{!exceedsCapacity && totalPartySize > 0 && (
								<p className="mt-1 text-xs text-muted-foreground">
									{(
										t("rsvp_remaining_capacity") ||
										"Remaining capacity: {{remaining}} {{person}}"
									)
										.replace("{{remaining}}", String(remainingCapacity))
										.replace(
											"{{person}}",
											remainingCapacity === 1
												? t("person") || "person"
												: t("people") || "people",
										)}
								</p>
							)}
						</div>
					</div>
				</div>

				{/* Selected Date Display */}
				{selectedDate && selectedTime && (
					<div className="mb-4 flex min-h-11 w-full flex-wrap items-center justify-center gap-2 rounded-md px-0 py-2 font-semibold text-base ring-offset-background sm:text-xl">
						{(() => {
							try {
								// Convert date and time slot to UTC Date using store timezone
								const utcDate = dayAndTimeSlotToUtc(
									selectedDate,
									selectedTime,
									storeTimezone,
								);

								// Validate date
								if (Number.isNaN(utcDate.getTime())) {
									return (
										<span className="text-muted-foreground">Invalid date</span>
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
									dateLocale.code === "zh-TW" || dateLocale.code === "ja"
										? "yyyy年M月d日 EEEE"
										: "EEEE, MMMM d, yyyy",
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
									<span className="text-muted-foreground">Invalid date</span>
								);
							}
						})()}
					</div>
				)}

				{/* Time Slot Buttons */}
				{selectedDate &&
					(rsvpMode !== RsvpMode.PERSONNEL || serviceStaffId) &&
					(!needsPersonnelFacilityPicker || personnelBookingFacilityId) && (
						<div className="mb-6">
							<FacilityReservationTimeSlots
								selectedDate={selectedDate}
								selectedTime={selectedTime}
								onTimeSelect={setSelectedTime}
								existingReservations={existingReservations}
								facility={slotFacility}
								rsvpSettings={rsvpSettings}
								storeSettings={storeSettings}
								storeUseBusinessHours={storeUseBusinessHours}
								storeTimezone={storeTimezone}
								numOfAdult={numOfAdult}
								numOfChild={numOfChild}
								dateLocale={dateLocale}
								restaurantPartyBooking={
									omitFacility && !needsPersonnelFacilityPicker
										? {
												maxCapacity: rsvpSettings?.maxCapacity ?? 0,
												headcount: numOfAdult + numOfChild,
											}
										: null
								}
							/>
						</div>
					)}
				{rsvpMode === RsvpMode.PERSONNEL && !serviceStaffId && selectedDate && (
					<p className="mb-4 text-sm text-muted-foreground">
						{t("rsvp_staff_required")}
					</p>
				)}
				{needsPersonnelFacilityPicker &&
					!personnelBookingFacilityId &&
					selectedDate && (
						<p className="mb-4 text-sm text-muted-foreground">
							{t("rsvp_facility_required")}
						</p>
					)}

				{/* Name and phone: anonymous, or signed-in when store requires phone and profile has none */}
				{(isAnonymousUser || mustCollectPhoneForSignedIn) && (
					<div className="mb-6 space-y-4">
						{isAnonymousUser && (
							<div>
								<Label className="mb-2 block text-sm font-medium">
									{t("your_name") || "Your Name"}{" "}
									<span className="text-destructive">*</span>
								</Label>
								<Input
									value={customerName}
									onChange={(e) => {
										const newName = e.target.value;
										setCustomerName(newName);
										// Save to localStorage for anonymous users (never save "anonymous")
										if (isAnonymousUser) {
											saveContactInfo(newName, undefined);
										}
									}}
									placeholder={t("your_name") || "Enter your name"}
									className="h-11 text-base sm:h-10 sm:min-h-0 sm:text-sm touch-manipulation"
									disabled={isSubmitting}
								/>
							</div>
						)}
						<div>
							<Label className="mb-2 block text-sm font-medium">
								{t("phone") || "Phone"}{" "}
								<span className="text-destructive">*</span>
							</Label>
							<div className="flex gap-1.5 sm:gap-2">
								<PhoneCountryCodeSelector
									value={phoneCountryCode}
									onValueChange={(newCode) => {
										setPhoneCountryCode(newCode);
										// Save phone when country code changes
										if (isAnonymousUser && customerPhoneLocal) {
											const fullPhone = `${newCode}${customerPhoneLocal}`;
											saveContactInfo(undefined, fullPhone);
										}
									}}
									disabled={isSubmitting}
								/>
								<Input
									type="tel"
									value={customerPhoneLocal}
									onChange={(e) => {
										const newPhoneLocal = e.target.value;
										setCustomerPhoneLocal(newPhoneLocal);
										// Save to localStorage for anonymous users
										if (isAnonymousUser) {
											const fullPhone = `${phoneCountryCode}${newPhoneLocal}`;
											saveContactInfo(undefined, fullPhone);
										}
									}}
									placeholder={t("phone_placeholder") || "Enter phone number"}
									className="h-11 flex-1 text-base sm:h-10 sm:min-h-0 sm:text-sm touch-manipulation"
									disabled={isSubmitting}
								/>
							</div>
						</div>
					</div>
				)}

				{/* Service staff fixed from personnel booking URL */}
				{prefilledServiceStaffId && (
					<div className="mb-6">
						<Label className="mb-2 block text-sm font-medium">
							{t("service_staff") || "Service Staff"}
						</Label>
						<p className="text-sm font-medium text-foreground">
							{prefilledStaffDisplayName}
						</p>
					</div>
				)}
				{/* Service Staff Selection */}
				{!omitFacility &&
					!prefilledServiceStaffId &&
					(rsvpMode === RsvpMode.PERSONNEL || serviceStaff.length > 0) && (
						<div className="mb-6">
							<Label className="mb-2 block text-sm font-medium">
								{t("service_staff") || "Service Staff"}
								{rsvpMode !== RsvpMode.PERSONNEL &&
									!(rsvpSettings?.mustHaveServiceStaff ?? false) && (
										<> ({t("optional") || "Optional"})</>
									)}
								{(rsvpMode === RsvpMode.PERSONNEL ||
									(rsvpSettings?.mustHaveServiceStaff ?? false)) && (
									<span className="text-destructive"> *</span>
								)}
							</Label>
							<ServiceStaffCombobox
								serviceStaff={serviceStaff}
								disabled={isSubmitting}
								defaultValue={
									serviceStaffId
										? serviceStaff.find((s) => s.id === serviceStaffId) || null
										: null
								}
								allowEmpty={true}
								storeCurrency={storeCurrency}
								onValueChange={(staff) => {
									setServiceStaffId(staff?.id || null);
								}}
							/>
						</div>
					)}

				<Separator className="my-6" />

				{/* Price Details */}
				{selectedDate && selectedTime && (
					<div className="mb-6">
						<RsvpPricingSummary
							facilityId={pricingFacilityId}
							facilityCost={facilityCost}
							serviceStaffId={serviceStaffId}
							serviceStaffCost={serviceStaffCost}
							totalCost={totalCost}
							storeCurrency={storeCurrency}
							isPricingLoading={isPricingLoading}
							discountAmount={
								pricingData?.details?.crossDiscount?.totalDiscountAmount
							}
						/>
					</div>
				)}

				{/* Rules and Restrictions */}
				{selectedDate && selectedTime && cancelPolicyInfo && (
					<div className="mb-6">
						<RsvpCancelPolicyInfo
							cancelPolicyInfo={cancelPolicyInfo}
							rsvpTime={
								selectedDate && selectedTime
									? dayAndTimeSlotToUtc(
											selectedDate,
											selectedTime,
											storeTimezone,
										)
									: null
							}
							rsvpSettings={rsvpSettings}
							facilityCost={facilityCost}
							serviceStaffCost={serviceStaffCost}
							currency={storeCurrency}
							useCustomerCredit={useCustomerCredit}
							creditExchangeRate={creditExchangeRate}
						/>
					</div>
				)}

				{/* Submit Button */}
				<Button
					ref={submitButtonRef}
					onClick={handleSubmit}
					disabled={Boolean(
						!selectedDate ||
							!selectedTime ||
							isSubmitting ||
							isPricingLoading ||
							isBlacklisted ||
							exceedsCapacity ||
							(isAnonymousUser && (!customerName || !customerPhoneLocal)) ||
							(mustCollectPhoneForSignedIn && !customerPhoneLocal?.trim()),
					)}
					className="h-11 w-full sm:h-10 sm:min-h-0 touch-manipulation"
					size="lg"
				>
					{isSubmitting
						? t("submitting") || "Submitting..."
						: t("create_reservation")}
				</Button>

				{/* Notes/Remarks */}
				<div className="mt-6 mb-6 sm:mt-10">
					<Label className="mb-2 block text-sm font-medium">
						{t("rsvp_message") || "Notes"} ({t("optional") || "Optional"})
					</Label>
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder={
							t("special_requests_or_notes") ||
							"Special requests or notes (optional)"
						}
						className="min-h-[100px] text-base sm:text-sm touch-manipulation"
						disabled={isSubmitting}
					/>
				</div>

				{isBlacklisted && (
					<div className="mt-2 text-center text-sm text-destructive">
						{t("rsvp_blacklisted") ||
							"You are not allowed to make reservations"}
					</div>
				)}
			</div>
		</div>
	);
}

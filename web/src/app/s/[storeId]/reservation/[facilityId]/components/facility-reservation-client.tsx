"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type {
	Rsvp,
	RsvpSettings,
	StoreFacility,
	StoreSettings,
	User,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { IconX } from "@tabler/icons-react";
import { PhoneCountryCodeSelector } from "@/components/auth/phone-country-code-selector";
import { cn } from "@/lib/utils";
import {
	epochToDate,
	getDateInTz,
	getOffsetHours,
	getUtcNow,
	dateToEpoch,
	convertToUtc,
	dayAndTimeSlotToUtc,
} from "@/utils/datetime-utils";
import {
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameDay,
	isSameMonth,
	addMonths,
	subMonths,
	getDay,
	startOfWeek,
	endOfWeek,
} from "date-fns";
import { zhTW, enUS, ja } from "date-fns/locale";
import { FacilityReservationCalendar } from "./facility-reservation-calendar";
import { FacilityReservationTimeSlots } from "./facility-reservation-time-slots";
import { ServiceStaffCombobox } from "@/components/combobox-service-staff";
import { getServiceStaffAction } from "@/actions/store/reservation/get-service-staff";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import useSWR from "swr";
import { useDebounceValue } from "usehooks-ts";
import { RsvpCancelPolicyInfo } from "@/components/rsvp-cancel-policy-info";
import { calculateCancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createReservationAction } from "@/actions/store/reservation/create-reservation";
import { toastError, toastSuccess } from "@/components/toaster";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
	createReservationSchema,
	type CreateReservationInput,
} from "@/actions/store/reservation/create-reservation.validation";
import type { Resolver } from "react-hook-form";

interface FacilityReservationClientProps {
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
}

export function FacilityReservationClient({
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
}: FacilityReservationClientProps) {
	const params = useParams<{ storeId: string }>();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

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
	const [selectedDate, setSelectedDate] = useState<Date | null>(null);
	const [selectedTime, setSelectedTime] = useState<string | null>(null); // Store as "HH:mm" string
	const [numOfAdult, setNumOfAdult] = useState(1);
	const [numOfChild, setNumOfChild] = useState(0);
	const [serviceStaffId, setServiceStaffId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
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

	// Initialize phoneCountryCode from localStorage
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

	const [customerName, setCustomerName] = useState(user?.name || "");
	const [customerPhoneLocal, setCustomerPhoneLocal] = useState(() => {
		if (user?.phoneNumber) {
			// Extract local number from full phone
			const match = user.phoneNumber.match(/^\+\d{1,3}(.+)$/);
			if (match) {
				return match[1];
			}
		}
		if (typeof window !== "undefined") {
			return localStorage.getItem("phone_local_number") || "";
		}
		return "";
	});

	// Calendar state
	const [currentMonth, setCurrentMonth] = useState(() => {
		const now = getUtcNow();
		return getDateInTz(now, getOffsetHours(storeTimezone));
	});

	// Fetch service staff
	const { data: serviceStaffData } = useSWR(
		["serviceStaff", storeId],
		async () => {
			const result = await getServiceStaffAction({ storeId });
			return result?.data?.serviceStaff ?? [];
		},
	);
	const serviceStaff: ServiceStaffColumn[] = serviceStaffData ?? [];

	// Calculate facility capacity
	const facilityCapacity = facility.capacity || 10;
	const maxAdults = Math.max(1, facilityCapacity);
	const maxChildren = Math.max(0, facilityCapacity - numOfAdult);

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

	const defaultValues: CreateReservationInput = useMemo(
		() => ({
			storeId,
			customerId: user?.id || null,
			name: customerName,
			phone: customerPhone,
			facilityId: facility.id,
			serviceStaffId: null,
			numOfAdult: 1,
			numOfChild: 0,
			rsvpTime: new Date(),
			message: "",
		}),
		[storeId, user, facility.id, customerName, customerPhone],
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
		form.setValue("facilityId", facility.id);
		form.setValue("numOfAdult", numOfAdult);
		form.setValue("numOfChild", numOfChild);
		form.setValue("serviceStaffId", serviceStaffId);
		form.setValue("message", message);
		form.setValue("name", customerName);
		form.setValue("phone", customerPhone);
	}, [
		selectedDate,
		selectedTime,
		numOfAdult,
		numOfChild,
		serviceStaffId,
		message,
		customerName,
		customerPhone,
		facility.id,
		storeTimezone,
		form,
	]);

	// Calculate pricing
	const [debouncedRsvpTime] = useDebounceValue(
		selectedDate && selectedTime
			? dayAndTimeSlotToUtc(selectedDate, selectedTime, storeTimezone)
			: null,
		500,
	);

	const { data: pricingData, isLoading: isPricingLoading } = useSWR(
		debouncedRsvpTime
			? [
					"/api/storeAdmin",
					storeId,
					"facilities",
					"calculate-pricing",
					debouncedRsvpTime,
					facility.id,
					serviceStaffId,
				]
			: null,
		async () => {
			if (!debouncedRsvpTime) return null;

			const res = await fetch(
				`/api/storeAdmin/${storeId}/facilities/calculate-pricing`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						facilityId: facility.id,
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
		if (facility.defaultCost) {
			return typeof facility.defaultCost === "number"
				? facility.defaultCost
				: Number(facility.defaultCost);
		}
		return null;
	}, [facility, pricingData]);

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
	}, [
		selectedDate,
		selectedTime,
		storeTimezone,
		rsvpSettings,
		facilityCost,
		serviceStaffCost,
	]);

	// Handle form submission
	const handleSubmit = useCallback(async () => {
		if (!selectedDate || !selectedTime) {
			toastError({
				title: t("error_title") || "Error",
				description:
					t("rsvp_time") + " " + (t("required") || "is required") ||
					"Please select a date and time",
			});
			return;
		}

		// Validate anonymous user fields
		if (isAnonymousUser) {
			if (!customerName || customerName.trim() === "") {
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
				toastSuccess({
					title: t("success_title") || "Success",
					description:
						t("rsvp_created_successfully") ||
						"Reservation created successfully",
				});
				// Navigate to checkout or reservation history
				router.push(`/s/${params.storeId}/checkout?rsvpId=${result.data.rsvp.id}`);
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
		isAnonymousUser,
		customerName,
		customerPhoneLocal,
		form,
		t,
		router,
		params.storeId,
	]);

	// Handle close
	const handleClose = useCallback(() => {
		router.back();
	}, [router]);

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-3 py-3 sm:px-4">
				<h1 className="text-lg font-semibold sm:text-xl">
					{facility.facilityName}
				</h1>
				<Button
					variant="ghost"
					size="icon"
					onClick={handleClose}
					className="h-10 w-10 sm:h-9 sm:w-9"
				>
					<IconX className="h-5 w-5" />
				</Button>
			</div>

			<div className="px-3 py-4 sm:px-4 sm:py-6">
				{/* Date & Party Size Selection - Two Column Layout */}
				<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
					{/* Left: Calendar */}
					<div>
						<FacilityReservationCalendar
							currentMonth={currentMonth}
							onMonthChange={setCurrentMonth}
							selectedDate={selectedDate}
							onDateSelect={setSelectedDate}
							existingReservations={existingReservations}
							facility={facility}
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
								<SelectTrigger className="h-10 w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: maxAdults }, (_, i) => i + 1).map(
										(num) => (
											<SelectItem key={num} value={num.toString()}>
												{num}{" "}
												{num === 1
													? t("person") || "person"
													: t("people") || "people"}
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
								<SelectTrigger className="h-10 w-full">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Array.from({ length: maxChildren + 1 }, (_, i) => i).map(
										(num) => (
											<SelectItem key={num} value={num.toString()}>
												{num}{" "}
												{num === 1
													? t("person") || "person"
													: t("people") || "people"}
											</SelectItem>
										),
									)}
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Selected Date Display */}
				{selectedDate && selectedTime && (
					<div className="mb-4 text-center text-sm font-medium text-muted-foreground">
						{dateLocale.code === "zh-TW" || dateLocale.code === "ja"
							? format(selectedDate, "yyyy年M月d日 EEEE", {
									locale: dateLocale,
								})
							: format(selectedDate, "EEEE, MMMM d, yyyy", {
									locale: dateLocale,
								})}
					</div>
				)}

				{/* Time Slot Buttons */}
				{selectedDate && (
					<div className="mb-6">
						<FacilityReservationTimeSlots
							selectedDate={selectedDate}
							selectedTime={selectedTime}
							onTimeSelect={setSelectedTime}
							existingReservations={existingReservations}
							facility={facility}
							rsvpSettings={rsvpSettings}
							storeSettings={storeSettings}
							storeTimezone={storeTimezone}
							numOfAdult={numOfAdult}
							numOfChild={numOfChild}
							dateLocale={dateLocale}
						/>
					</div>
				)}

				{/* Name and Phone (Required for anonymous users) */}
				{isAnonymousUser && (
					<div className="mb-6 space-y-4">
						<div>
							<Label className="mb-2 block text-sm font-medium">
								{t("your_name") || "Your Name"}{" "}
								<span className="text-destructive">*</span>
							</Label>
							<Input
								value={customerName}
								onChange={(e) => setCustomerName(e.target.value)}
								placeholder={t("your_name_placeholder") || "Enter your name"}
								className="h-10 text-base sm:h-9 sm:text-sm"
								disabled={isSubmitting}
							/>
						</div>
						<div>
							<Label className="mb-2 block text-sm font-medium">
								{t("phone") || "Phone"}{" "}
								<span className="text-destructive">*</span>
							</Label>
							<div className="flex gap-2">
								<PhoneCountryCodeSelector
									value={phoneCountryCode}
									onValueChange={setPhoneCountryCode}
									disabled={isSubmitting}
								/>
								<Input
									type="tel"
									value={customerPhoneLocal}
									onChange={(e) => setCustomerPhoneLocal(e.target.value)}
									placeholder={t("phone_placeholder") || "Enter phone number"}
									className="h-10 flex-1 text-base sm:h-9 sm:text-sm"
									disabled={isSubmitting}
								/>
							</div>
						</div>
					</div>
				)}

				{/* Service Staff Selection (Optional) */}
				{serviceStaff.length > 0 && (
					<div className="mb-6">
						<Label className="mb-2 block text-sm font-medium">
							{t("service_staff") || "Service Staff"} (
							{t("optional") || "Optional"})
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

				{/* Notes/Remarks */}
				<div className="mb-6">
					<Label className="mb-2 block text-sm font-medium">
						{t("rsvp_message") || "Notes"} ({t("optional") || "Optional"})
					</Label>
					<Textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder={
							t("rsvp_message_placeholder") ||
							"Enter any special requests or notes..."
						}
						className="min-h-[100px]"
						disabled={isSubmitting}
					/>
				</div>

				<Separator className="my-6" />

				{/* Price Details */}
				{selectedDate && selectedTime && (
					<div className="mb-6">
						<div className="mb-2 text-sm font-semibold">
							{t("price_details") || "Price Details"}
						</div>
						<div className="space-y-2 rounded-md border bg-muted/50 p-3 text-sm">
							{facilityCost !== null && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										{t("rsvp_facility_cost") || "Facility"}
									</span>
									<span className="font-medium">
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: storeCurrency.toUpperCase(),
											maximumFractionDigits: 2,
											minimumFractionDigits: 2,
										}).format(facilityCost)}
									</span>
								</div>
							)}
							{serviceStaffCost !== null && (
								<div className="flex justify-between">
									<span className="text-muted-foreground">
										{t("service_staff") || "Service Staff"}
									</span>
									<span className="font-medium">
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: storeCurrency.toUpperCase(),
											maximumFractionDigits: 2,
											minimumFractionDigits: 2,
										}).format(serviceStaffCost)}
									</span>
								</div>
							)}
							<div className="flex justify-between border-t pt-2 font-semibold">
								<span>{t("cart_summary_total") || "Total"}</span>
								<span>
									{new Intl.NumberFormat("en-US", {
										style: "currency",
										currency: storeCurrency.toUpperCase(),
										maximumFractionDigits: 2,
										minimumFractionDigits: 2,
									}).format(totalCost)}
								</span>
							</div>
						</div>
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
					onClick={handleSubmit}
					disabled={
						!selectedDate ||
						!selectedTime ||
						isSubmitting ||
						isPricingLoading ||
						isBlacklisted ||
						(isAnonymousUser && (!customerName || !customerPhoneLocal))
					}
					className="h-11 w-full sm:h-10"
					size="lg"
				>
					{isSubmitting
						? t("submitting") || "Submitting..."
						: t("checkout") || "Proceed to Checkout"}
				</Button>

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

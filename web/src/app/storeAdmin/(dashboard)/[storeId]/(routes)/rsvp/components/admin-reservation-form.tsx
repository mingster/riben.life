"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { Rsvp } from "@/types";
import { createRsvpAction } from "@/actions/storeAdmin/rsvp/create-rsvp";
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import { createRsvpSchema } from "@/actions/storeAdmin/rsvp/create-rsvp.validation";
import {
	updateRsvpSchema,
	type UpdateRsvpInput,
} from "@/actions/storeAdmin/rsvp/update-rsvp.validation";
import { Separator } from "@/components/ui/separator";
import { StoreMembersCombobox } from "../../customers/components/combobox-store-members";
import { FacilityCombobox } from "@/components/combobox-facility";
import { ServiceStaffCombobox } from "@/components/combobox-service-staff";
import useSWR from "swr";
import type { User } from "@/types";
import { authClient } from "@/lib/auth-client";
import { Role } from "@/types/enum";
import {
	getUtcNow,
	epochToDate,
	formatUtcDateToDateTimeLocal,
	convertToUtc,
	dateToEpoch,
} from "@/utils/datetime-utils";
import type { StoreFacility } from "@/types";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { RsvpStatus } from "@/types/enum";
import {
	checkTimeAgainstBusinessHours,
	rsvpTimeToEpoch,
} from "@/utils/rsvp-utils";

interface AdminReservationFormProps {
	storeId: string;
	rsvpSettings: {
		minPrepaidPercentage?: number | null;
		canCancel?: boolean | null;
		cancelHours?: number | null;
		singleServiceMode?: boolean | null;
		defaultDuration?: number | null;
		useBusinessHours?: boolean | null;
		rsvpHours?: string | null;
		mustSelectFacility?: boolean | null;
		mustHaveServiceStaff?: boolean | null;
	} | null;
	storeSettings: {
		businessHours?: string | null;
	} | null;
	storeUseBusinessHours?: boolean | null;
	existingReservations?: Rsvp[];
	// Create mode props
	defaultRsvpTime?: Date;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	// Edit mode props
	rsvp?: Rsvp | null;
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
	// Common props
	storeTimezone?: string;
	storeCurrency?: string;
}

// Form component for admin to edit or create an rsvp.
//
// all datetime (rsvpTime, arriveTime, etc) is stored in UTC epoch milliseconds.
// all datetime is displayed using store's defaultTimeZone.
export function AdminReservationForm({
	storeId,
	rsvpSettings,
	storeSettings,
	storeUseBusinessHours,
	existingReservations = [],
	defaultRsvpTime,
	onReservationCreated,
	rsvp,
	onReservationUpdated,
	storeTimezone = "Asia/Taipei",
	storeCurrency = "twd",
}: AdminReservationFormProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Determine if we're in edit mode
	const isEditMode = Boolean(rsvp);

	// Helper to format UTC Date to datetime-local string in store timezone
	const formatDateTimeLocal = useCallback(
		(date: Date | string | number): string => {
			// Ensure we have a proper Date object
			let dateObj: Date;
			if (date instanceof Date) {
				dateObj = date;
			} else if (typeof date === "string" || typeof date === "number") {
				// If it's a string or number, create Date from it
				// The timestamp/ISO string should represent UTC time
				dateObj = new Date(date);
			} else {
				return "";
			}

			// Validate the date
			if (isNaN(dateObj.getTime())) {
				return "";
			}
			// Use Intl.DateTimeFormat to correctly format UTC date in store timezone
			const result = formatUtcDateToDateTimeLocal(dateObj, storeTimezone);

			return result;
		},
		[storeTimezone],
	);

	// Helper to parse datetime-local string (interpreted as store timezone) to UTC Date
	const parseDateTimeLocal = useCallback(
		(value: string): Date => {
			// Use convertStoreTimezoneToUtc to interpret the string as store timezone
			// and convert to UTC Date
			return convertToUtc(value, storeTimezone);
		},
		[storeTimezone],
	);

	const [loading, setLoading] = useState(false);

	// Memoize the default rsvpTime to avoid creating new Date objects on every render
	// Only compute once when defaultRsvpTime is not provided
	// Use a ref to store the initial default time to prevent it from changing on every render
	const defaultRsvpTimeRef = useRef<Date | null>(null);

	const memoizedDefaultRsvpTime = useMemo(() => {
		if (defaultRsvpTime) {
			// If defaultRsvpTime is provided, use it directly
			return defaultRsvpTime;
		}
		// If no defaultRsvpTime and we haven't stored one yet, create and store it
		if (!defaultRsvpTimeRef.current) {
			defaultRsvpTimeRef.current = getUtcNow();
		}
		// Return the stored default time (stays stable across renders)
		return defaultRsvpTimeRef.current;
	}, [defaultRsvpTime]);

	// Fetch store members for userId selection
	const customersUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/customers`;
	const customersFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const { data: storeMembers, isLoading: isLoadingStoreMembers } = useSWR<
		User[]
	>(customersUrl, customersFetcher);

	// Fetch facilities for facilityId selection
	const facilitiesUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/facilities`;
	const facilitiesFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const { data: storeFacilities, isLoading: isLoadingStoreFacilities } = useSWR<
		StoreFacility[]
	>(facilitiesUrl, facilitiesFetcher);

	// Fetch service staff for serviceStaffId selection
	const serviceStaffUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/service-staff`;
	const serviceStaffFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const { data: storeServiceStaff, isLoading: isLoadingServiceStaff } = useSWR<
		ServiceStaffColumn[]
	>(serviceStaffUrl, serviceStaffFetcher);

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
				hoursJson = rsvpSettings?.rsvpHours;
				errorMessage = "The selected time is outside RSVP hours";
			}
			// 2. If RsvpSettings.useBusinessHours = false AND Store.useBusinessHours = true, use StoreSettings.businessHours
			else if (storeUseBusinessHours === true) {
				hoursJson = storeSettings?.businessHours;
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

	// Helper function to check if a service staff is available at a given time
	const isServiceStaffAvailableAtTime = useCallback(
		(
			serviceStaff: ServiceStaffColumn,
			checkTime: Date | null | undefined,
			timezone: string,
		): boolean => {
			// If no time selected, show all service staff
			if (!checkTime || isNaN(checkTime.getTime())) {
				return true;
			}

			// If service staff has no business hours, assume they're always available
			if (!serviceStaff.businessHours) {
				return true;
			}

			const result = checkTimeAgainstBusinessHours(
				serviceStaff.businessHours,
				checkTime,
				timezone,
			);
			return result.isValid;
		},
		[],
	);

	const defaultValues = useMemo(() => {
		if (rsvp) {
			return {
				storeId: rsvp.storeId,
				id: rsvp.id,
				customerId: rsvp.customerId,
				facilityId: rsvp.facilityId || null,
				serviceStaffId: rsvp.serviceStaffId || null,
				numOfAdult: rsvp.numOfAdult,
				numOfChild: rsvp.numOfChild,
				rsvpTime:
					rsvp.rsvpTime instanceof Date
						? rsvp.rsvpTime
						: (epochToDate(
								typeof rsvp.rsvpTime === "number"
									? BigInt(rsvp.rsvpTime)
									: typeof rsvp.rsvpTime === "bigint"
										? rsvp.rsvpTime
										: BigInt(rsvp.rsvpTime),
							) ?? new Date()),
				arriveTime:
					rsvp.arriveTime instanceof Date
						? rsvp.arriveTime
						: rsvp.arriveTime
							? epochToDate(
									typeof rsvp.arriveTime === "number"
										? BigInt(rsvp.arriveTime)
										: typeof rsvp.arriveTime === "bigint"
											? rsvp.arriveTime
											: BigInt(rsvp.arriveTime),
								)
							: null,
				status: rsvp.status,
				message: rsvp.message,
				alreadyPaid: rsvp.alreadyPaid,
				confirmedByStore: rsvp.confirmedByStore,
				confirmedByCustomer: rsvp.confirmedByCustomer,
				facilityCost:
					rsvp.facilityCost !== null && rsvp.facilityCost !== undefined
						? Number(rsvp.facilityCost)
						: null,
				pricingRuleId: rsvp.pricingRuleId,
			};
		}
		return {
			//default value when create new
			storeId: storeId,
			id: "",
			customerId: null,
			facilityId: null, // Allow null for reservations without facilities
			serviceStaffId: null,
			numOfAdult: 1,
			numOfChild: 0,
			rsvpTime: memoizedDefaultRsvpTime,
			arriveTime: null,
			status: RsvpStatus.Pending,
			message: null,
			alreadyPaid: false,
			confirmedByStore: true,
			confirmedByCustomer: false,
			facilityCost: null,
			pricingRuleId: null,
		};
	}, [rsvp, storeId, memoizedDefaultRsvpTime]);

	// Use updateRsvpSchema when editing, createRsvpSchema when creating
	const schema = useMemo(
		() => (isEditMode ? updateRsvpSchema : createRsvpSchema),
		[isEditMode],
	);

	// Form input type: UpdateRsvpInput when editing, CreateRsvpInput when creating
	type FormInput = Omit<UpdateRsvpInput, "id"> & { id?: string };

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	// Reset form when defaultValues change (rsvp, storeId, or memoizedDefaultRsvpTime changes)
	// This ensures the form is reset with updated values when any dependency changes
	useEffect(() => {
		form.reset(defaultValues);
	}, [form, defaultValues]);

	// Watch for facilityId and rsvpTime changes to auto-calculate facilityCost
	const facilityId = form.watch("facilityId");
	const rsvpTime = form.watch("rsvpTime");
	const status = form.watch("status");
	const isCompleted = status === RsvpStatus.Completed;
	const alreadyPaid = form.watch("alreadyPaid");

	// Get current user session to check admin role
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user?.role === Role.admin;
	const isOwner = session?.user?.role === Role.owner;
	const isStoreAdmin = session?.user?.role === Role.storeAdmin;
	const canEditFacilityCost = isOwner || isStoreAdmin;

	// Only allow editing completed RSVPs if user is admin
	const canEditCompleted = !isCompleted || isAdmin;

	// Filter facilities based on rsvpTime and existing reservations
	// When editing, always include the current facility even if it's not available at the selected time
	const availableFacilities = useMemo(() => {
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
		storeFacilities,
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

	// Filter service staff based on rsvpTime and business hours
	// When editing, always include the current service staff even if they're not available at the selected time
	const availableServiceStaff = useMemo(() => {
		if (!storeServiceStaff) {
			return [];
		}
		if (!rsvpTime || isNaN(rsvpTime.getTime())) {
			return storeServiceStaff;
		}

		// Filter by business hours availability
		let filtered = storeServiceStaff.filter((staff: ServiceStaffColumn) =>
			isServiceStaffAvailableAtTime(staff, rsvpTime, storeTimezone),
		);

		// When editing, ensure the current service staff is included even if filtered out
		// Use form's serviceStaffId first, then fall back to rsvp.serviceStaffId
		const currentServiceStaffId =
			form.getValues("serviceStaffId") || rsvp?.serviceStaffId;
		if (isEditMode && currentServiceStaffId) {
			const currentServiceStaff = storeServiceStaff.find(
				(staff: ServiceStaffColumn) => staff.id === currentServiceStaffId,
			);
			if (
				currentServiceStaff &&
				!filtered.find(
					(staff: ServiceStaffColumn) => staff.id === currentServiceStaff.id,
				)
			) {
				filtered.push(currentServiceStaff);
			}
		}

		return filtered;
	}, [
		storeServiceStaff,
		rsvpTime,
		storeTimezone,
		isServiceStaffAvailableAtTime,
		isEditMode,
		form,
		rsvp?.serviceStaffId,
	]);

	// Clear facility selection if it's no longer available
	// Skip this when editing to preserve the original facility selection
	useEffect(() => {
		// Don't clear facility when editing - allow user to keep original selection
		if (isEditMode) {
			return;
		}

		const currentFacilityId = form.getValues("facilityId");
		if (
			currentFacilityId &&
			!availableFacilities.find(
				(f: StoreFacility) => f.id === currentFacilityId,
			)
		) {
			form.setValue(
				"facilityId",
				availableFacilities.length > 0 ? availableFacilities[0].id : "",
			);
		}
	}, [availableFacilities, form, isEditMode]);

	// Extract setValue for stable reference (react-hook-form's setValue is stable)
	const { setValue } = form;

	// Calculate pricing only when rsvpTime/facilityId changes
	useEffect(() => {
		const calculatePricing = async () => {
			if (!facilityId || !rsvpTime) {
				return;
			}

			// Skip if rsvpTime is not a valid date
			const dateTime =
				rsvpTime instanceof Date
					? rsvpTime
					: typeof rsvpTime === "bigint"
						? new Date(Number(rsvpTime))
						: typeof rsvpTime === "number"
							? new Date(rsvpTime)
							: new Date(rsvpTime);
			if (Number.isNaN(dateTime.getTime())) {
				return;
			}

			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${storeId}/facilities/calculate-pricing`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							facilityId: facilityId,
							rsvpTime: dateTime.toISOString(),
						}),
					},
				);

				if (!response.ok) {
					return;
				}

				const result = await response.json();
				if (result.cost !== null && result.cost !== undefined) {
					setValue("facilityCost", result.cost, {
						shouldValidate: false,
					});
				}
				if (result.pricingRuleId) {
					setValue("pricingRuleId", result.pricingRuleId, {
						shouldValidate: false,
					});
				}
			} catch (error) {
				// Silently fail - pricing calculation is optional
				// Error is ignored as pricing calculation failure should not block form submission
			}
		};

		calculatePricing();
	}, [facilityId, rsvpTime, storeId, setValue]);

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			// Validate rsvpTime against store business hours or RSVP hours
			const timeValidationError = validateRsvpTimeAgainstHours(values.rsvpTime);
			if (timeValidationError) {
				toastError({
					title: t("error_title"),
					description: timeValidationError,
				});
				setLoading(false);
				return;
			}

			// Validate facility is required when mustSelectFacility is true and facilities are available
			if (
				rsvpSettings?.mustSelectFacility &&
				availableFacilities.length > 0 &&
				!values.facilityId
			) {
				toastError({
					title: t("error_title"),
					description: t("facility_required") || "Facility is required",
				});
				form.setError("facilityId", {
					type: "manual",
					message: t("facility_required") || "Facility is required",
				});
				setLoading(false);
				return;
			}

			// Validate service staff is required when mustHaveServiceStaff is true and service staff are available
			if (
				rsvpSettings?.mustHaveServiceStaff &&
				availableServiceStaff &&
				availableServiceStaff.length > 0 &&
				!values.serviceStaffId
			) {
				toastError({
					title: t("error_title"),
					description:
						t("rsvp_service_staff_required") || "Service staff is required",
				});
				form.setError("serviceStaffId", {
					type: "manual",
					message:
						t("rsvp_service_staff_required") || "Service staff is required",
				});
				setLoading(false);
				return;
			}

			// Check if cancelled or no-show first (highest priority)
			if (values.status === RsvpStatus.Cancelled) {
				// Status already set to Cancelled, keep it
			} else if (values.status === RsvpStatus.NoShow) {
				// Status already set to NoShow, keep it
			} else if (values.confirmedByCustomer) {
				values.status = RsvpStatus.Completed;
			} else {
				values.status = RsvpStatus.Pending;
			}

			if (!isEditMode) {
				const result = await createRsvpAction(storeId, {
					customerId: values.customerId || null,
					facilityId: values.facilityId || null,
					serviceStaffId: values.serviceStaffId || null,
					numOfAdult: values.numOfAdult,
					numOfChild: values.numOfChild,
					rsvpTime: values.rsvpTime, //should be still in store timezone. server action will convert to UTC.
					arriveTime: values.arriveTime || null,
					status: values.status,
					message: values.message || null,
					alreadyPaid: values.alreadyPaid,
					confirmedByStore: values.confirmedByStore,
					confirmedByCustomer: values.confirmedByCustomer,
					facilityCost: values.facilityCost || null,
					pricingRuleId: values.pricingRuleId || null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rsvp) {
					toastSuccess({
						title: t("rsvp") + " " + t("created"),
						description: "",
					});
					onReservationCreated?.(result.data.rsvp);
				}
			} else {
				const rsvpId = rsvp?.id;
				if (!rsvpId) {
					toastError({
						title: t("error_title"),
						description: "Rsvp not found.",
					});
					return;
				}

				const result = await updateRsvpAction(storeId, {
					id: rsvpId,
					customerId: values.customerId || null,
					facilityId: values.facilityId || null,
					serviceStaffId: values.serviceStaffId || null,
					numOfAdult: values.numOfAdult,
					numOfChild: values.numOfChild,
					rsvpTime: values.rsvpTime,
					arriveTime: values.arriveTime || null,
					status: values.status,
					message: values.message || null,
					alreadyPaid: values.alreadyPaid,
					confirmedByStore: values.confirmedByStore,
					confirmedByCustomer: values.confirmedByCustomer,
					facilityCost: values.facilityCost || null,
					pricingRuleId: values.pricingRuleId || null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.rsvp) {
					toastSuccess({
						title: t("rsvp") + " " + t("updated"),
						description: "",
					});
					onReservationUpdated?.(result.data.rsvp);
				}
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit, (errors) => {
					const firstErrorKey = Object.keys(errors)[0];
					if (firstErrorKey) {
						const error = errors[firstErrorKey as keyof typeof errors];
						const errorMessage = error?.message;
						if (errorMessage) {
							toastError({
								title: t("error_title"),
								description: errorMessage,
							});
						}
					}
				})}
				className="space-y-4"
			>
				<FormField
					control={form.control}
					name="customerId"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("customer")}</FormLabel>
							<FormControl>
								<StoreMembersCombobox
									storeMembers={storeMembers || []}
									disabled={
										!canEditCompleted ||
										loading ||
										form.formState.isSubmitting ||
										isLoadingStoreMembers
									}
									defaultValue={field.value ? String(field.value) : undefined}
									onValueChange={(user) => {
										field.onChange(user?.id || null);
									}}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="numOfAdult"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("rsvp_num_of_adult")}{" "}
									<span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										type="number"
										disabled={
											!canEditCompleted ||
											loading ||
											form.formState.isSubmitting
										}
										value={
											field.value !== undefined ? field.value.toString() : ""
										}
										onChange={(event) =>
											field.onChange(Number.parseInt(event.target.value) || 1)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="numOfChild"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("rsvp_num_of_child")}</FormLabel>
								<FormControl>
									<Input
										type="number"
										disabled={
											!canEditCompleted ||
											loading ||
											form.formState.isSubmitting
										}
										value={
											field.value !== undefined ? field.value.toString() : ""
										}
										onChange={(event) =>
											field.onChange(Number.parseInt(event.target.value) || 0)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				{/** Reservation Time */}
				<FormField
					control={form.control}
					name="rsvpTime"
					render={({ field }) => {
						// Validate time against store/RSVP hours when it changes
						const timeValidationError = field.value
							? validateRsvpTimeAgainstHours(field.value)
							: null;

						return (
							<FormItem>
								<FormLabel>
									{t("rsvp_time")} <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									<Input
										type="datetime-local"
										disabled={
											!canEditCompleted ||
											loading ||
											form.formState.isSubmitting
										}
										value={field.value ? formatDateTimeLocal(field.value) : ""}
										onChange={(event) => {
											const value = event.target.value;
											if (value) {
												field.onChange(parseDateTimeLocal(value));
											}
										}}
									/>
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
				<FormField
					control={form.control}
					name="message"
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("rsvp_message")}</FormLabel>
							<FormControl>
								<Textarea
									disabled={
										!canEditCompleted || loading || form.formState.isSubmitting
									}
									value={field.value ?? ""}
									onChange={(event) =>
										field.onChange(event.target.value || null)
									}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Separator />

				{/** Facility Cost and Credit */}

				<FormField
					control={form.control}
					name="facilityId"
					render={({ field }) => {
						const isRequired =
							rsvpSettings?.mustSelectFacility &&
							availableFacilities.length > 0;
						return (
							<FormItem>
								<FormLabel>
									{t("rsvp_facility")}
									{isRequired && <span className="text-destructive"> *</span>}
								</FormLabel>
								<FormControl>
									{availableFacilities.length > 0 ? (
										<FacilityCombobox
											storeFacilities={availableFacilities}
											disabled={
												!canEditCompleted ||
												loading ||
												form.formState.isSubmitting ||
												isLoadingStoreFacilities
											}
											defaultValue={
												field.value
													? availableFacilities.find(
															(f: StoreFacility) => f.id === field.value,
														) || null
													: null
											}
											allowNone={!isRequired}
											onValueChange={(facility) => {
												field.onChange(facility?.id || null);
											}}
										/>
									) : (
										<div className="text-sm text-muted-foreground">
											{isEditMode && field.value
												? (() => {
														const selectedFacility = storeFacilities?.find(
															(f: StoreFacility) => f.id === field.value,
														);
														return selectedFacility
															? selectedFacility.name
															: rsvpTime
																? t(
																		"rsvp_no_facilities_available_at_selected_time",
																	) ||
																	"No facilities available at selected time"
																: t("rsvp_no_facilities_available") ||
																	"No facilities available";
													})()
												: rsvpTime
													? t(
															"rsvp_no_facilities_available_at_selected_time",
														) || "No facilities available at selected time"
													: isRequired
														? t("rsvp_no_facilities_available") ||
															"No facilities available"
														: t("rsvp_no_facilities_available_optional") ||
															"No facilities available (optional)"}
										</div>
									)}
								</FormControl>
								<FormDescription className="text-xs font-mono text-gray-500">
									{isRequired
										? t("rsvp_facility_required") ||
											"Required: Select a facility for this reservation"
										: t("rsvp_facility_optional_description") ||
											"Optional: Select a facility for this reservation"}
								</FormDescription>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				<FormField
					control={form.control}
					name="serviceStaffId"
					render={({ field }) => {
						const isRequired =
							rsvpSettings?.mustHaveServiceStaff &&
							availableServiceStaff &&
							availableServiceStaff.length > 0;
						// Get selected service staff from full list (like customer-side for consistency)
						const selectedServiceStaff = field.value
							? storeServiceStaff?.find(
									(ss: ServiceStaffColumn) => ss.id === field.value,
								) || null
							: null;
						return (
							<FormItem>
								<FormLabel>
									{t("service_staff")}
									{isRequired && <span className="text-destructive"> *</span>}
								</FormLabel>
								<FormControl>
									{availableServiceStaff && availableServiceStaff.length > 0 ? (
										<ServiceStaffCombobox
											serviceStaff={availableServiceStaff}
											disabled={
												!canEditCompleted ||
												loading ||
												form.formState.isSubmitting ||
												isLoadingServiceStaff
											}
											defaultValue={selectedServiceStaff || null}
											allowEmpty={!isRequired}
											storeCurrency={storeCurrency?.toUpperCase() || "TWD"}
											onValueChange={(staff) => {
												field.onChange(staff?.id || null);
											}}
										/>
									) : (
										<div className="text-sm text-muted-foreground">
											{isLoadingServiceStaff
												? t("loading") || "Loading..."
												: isRequired
													? rsvpTime
														? t(
																"no_service_staff_available_at_selected_time",
															) ||
															"No service staff available at selected time (required)"
														: t("no_service_staff_found") ||
															"No service staff found (required)"
													: rsvpTime
														? t(
																"no_service_staff_available_at_selected_time",
															) || "No service staff available at selected time"
														: t("no_service_staff_found") ||
															"No service staff found"}
										</div>
									)}
								</FormControl>
								<FormDescription className="text-xs font-mono text-gray-500">
									{isRequired
										? t("rsvp_service_staff_required") ||
											"Required: Select a service staff member for this reservation"
										: t("select_service_staff") ||
											"Optional: Select a service staff member for this reservation"}
								</FormDescription>
								<FormMessage />
							</FormItem>
						);
					}}
				/>

				{facilityId && (
					<FormField
						control={form.control}
						name="facilityCost"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("rsvp_facility_cost")}</FormLabel>
								<FormControl>
									<Input
										type="number"
										step="0.01"
										disabled={
											!canEditCompleted ||
											!canEditFacilityCost ||
											loading ||
											form.formState.isSubmitting
										}
										value={
											field.value !== null && field.value !== undefined
												? field.value.toString()
												: ""
										}
										onChange={(event) => {
											const value = event.target.value;
											field.onChange(value ? Number.parseFloat(value) : null);
										}}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{/** Already Paid */}
				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="alreadyPaid"
						render={({ field }) => {
							const isCancelled = form.watch("status") === RsvpStatus.Cancelled;
							const isNoShow = form.watch("status") === RsvpStatus.NoShow;
							const isDisabled = isCancelled || isNoShow;
							return (
								<FormItem className="flex flex-row items-center space-x-3 space-y-0">
									<FormControl>
										<input
											type="checkbox"
											checked={field.value}
											onChange={(e) => {
												field.onChange(e.target.checked);
												// Uncheck cancelled/no-show when other status is set
												if (e.target.checked && (isCancelled || isNoShow)) {
													form.setValue("status", RsvpStatus.Pending);
												}
											}}
											disabled={
												!canEditCompleted ||
												loading ||
												form.formState.isSubmitting ||
												isDisabled
											}
											className="h-5 w-5 sm:h-4 sm:w-4"
										/>
									</FormControl>
									<FormLabel>{t("rsvp_already_paid")}</FormLabel>
									<FormMessage />
									<FormDescription className="text-xs font-mono text-gray-500">
										{t("rsvp_already_paid_descr")}
									</FormDescription>
								</FormItem>
							);
						}}
					/>
				</div>

				<Separator />

				{isEditMode && (
					<>
						<div className="text-xs text-muted-foreground font-mono">
							{t("rsvp_section_completed")}
						</div>

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="arriveTime"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("rsvp_arrival_time")}</FormLabel>
										<FormControl>
											<Input
												type="datetime-local"
												disabled={
													!canEditCompleted ||
													loading ||
													form.formState.isSubmitting
												}
												value={
													field.value ? formatDateTimeLocal(field.value) : ""
												}
												onChange={(event) => {
													const value = event.target.value;
													if (value) {
														field.onChange(parseDateTimeLocal(value));
													} else {
														field.onChange(null);
													}
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</>
				)}

				{/* Validation Error Summary */}
				{Object.keys(form.formState.errors).length > 0 && (
					<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
						<div className="text-sm font-semibold text-destructive">
							{t("please_fix_validation_errors") ||
								"Please fix the following errors:"}
						</div>
						{Object.entries(form.formState.errors).map(([field, error]) => {
							// Map field names to user-friendly labels using i18n
							const fieldLabels: Record<string, string> = {
								rsvpTime: t("RSVP_Time") || "RSVP Time",
								arriveTime: t("Arrive_Time") || "Arrive Time",
								facilityId: t("facility") || "Facility",
								serviceStaffId: t("Service_Staff") || "Service Staff",
								customerId: t("Customer") || "Customer",
								status: t("Status") || "Status",
								cost: t("Cost") || "Cost",
								credit: t("Credit") || "Credit",
								note: t("Note") || "Note",
								noShow: t("No_Show") || "No Show",
							};
							const fieldLabel = fieldLabels[field] || field;
							return (
								<div
									key={field}
									className="text-sm text-destructive flex items-start gap-2"
								>
									<span className="font-medium">{fieldLabel}:</span>
									<span>{error.message as string}</span>
								</div>
							);
						})}
					</div>
				)}

				{/* Submit Button */}
				<Button
					type="submit"
					disabled={
						loading || !form.formState.isValid || form.formState.isSubmitting
					}
					className="w-full disabled:opacity-25"
					autoFocus
				>
					{loading
						? isEditMode
							? t("updating") || "Updating..."
							: t("submitting") || "Submitting..."
						: isEditMode
							? t("update_reservation")
							: t("create_Reservation")}
				</Button>
			</form>
		</Form>
	);
}

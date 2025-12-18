"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Rsvp } from "@/types";
import { createRsvpAction } from "@/actions/storeAdmin/rsvp/create-rsvp";
import { updateRsvpAction } from "@/actions/storeAdmin/rsvp/update-rsvp";
import {
	createRsvpSchema,
	type CreateRsvpInput,
} from "@/actions/storeAdmin/rsvp/create-rsvp.validation";
import {
	updateRsvpSchema,
	type UpdateRsvpInput,
} from "@/actions/storeAdmin/rsvp/update-rsvp.validation";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { StoreMembersCombobox } from "../../customers/components/combobox-store-members";
import { FacilityCombobox } from "@/components/combobox-facility";
import useSWR from "swr";
import type { User } from "@/types";
import { authClient } from "@/lib/auth-client";
import { Role } from "@/types/enum";
import {
	getUtcNow,
	epochToDate,
	formatUtcDateToDateTimeLocal,
	convertToUtc,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import type { StoreFacility } from "@/types";
import { useEffect } from "react";
import { RsvpStatus } from "@/types/enum";

interface EditRsvpDialogProps {
	rsvp?: Rsvp | null;
	isNew?: boolean;
	defaultRsvpTime?: Date;
	trigger?: React.ReactNode;
	onCreated?: (rsvp: Rsvp) => void;
	onUpdated?: (rsvp: Rsvp) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	storeTimezone?: string;
	rsvpSettings?: {
		prepaidRequired?: boolean | null;
	} | null;
}

// dialog to edit or create an rsvp by admin user.
//
// all datetime (rsvpTime, arriveTime, etc) is stored in UTC epoch milliseconds.
// all datetime is displayed using store's defaultTimeZone.
export function AdminEditRsvpDialog({
	rsvp,
	isNew = false,
	defaultRsvpTime,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
	storeTimezone = "Asia/Taipei",
	rsvpSettings,
}: EditRsvpDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

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

			// Debug logging
			/*
			if (process.env.NODE_ENV === "development") {
				console.log("formatDateTimeLocal input:", {
					date,
					dateObj: dateObj.toISOString(),
					dateObjUTC: dateObj.toUTCString(),
					dateObjLocal: dateObj.toString(),
					storeTimezone,
				});
			}
				


			// Debug logging
			if (process.env.NODE_ENV === "development") {
				console.log("formatDateTimeLocal result:", result);
			}
*/
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

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	// Fetch store members for userId selection
	const customersUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/customers`;
	const customersFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const {
		data: storeMembers,
		error: storeMembersError,
		isLoading: isLoadingStoreMembers,
	} = useSWR<User[]>(customersUrl, customersFetcher);

	// Fetch facilities for facilityId selection
	const facilitiesUrl = `${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/facilities`;
	const facilitiesFetcher = (url: RequestInfo) =>
		fetch(url).then((res) => res.json());
	const {
		data: storeFacilities,
		error: storeFacilitiesError,
		isLoading: isLoadingStoreFacilities,
	} = useSWR<StoreFacility[]>(facilitiesUrl, facilitiesFetcher);

	const isEditMode = Boolean(rsvp) && !isNew;

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

			try {
				// Parse business hours JSON
				const schedule = JSON.parse(facility.businessHours) as {
					Monday?: Array<{ from: string; to: string }> | "closed";
					Tuesday?: Array<{ from: string; to: string }> | "closed";
					Wednesday?: Array<{ from: string; to: string }> | "closed";
					Thursday?: Array<{ from: string; to: string }> | "closed";
					Friday?: Array<{ from: string; to: string }> | "closed";
					Saturday?: Array<{ from: string; to: string }> | "closed";
					Sunday?: Array<{ from: string; to: string }> | "closed";
				};

				// Convert UTC time to store timezone for checking
				const offsetHours = getOffsetHours(timezone);
				const timeInStoreTz = getDateInTz(checkTime, offsetHours);

				// Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
				const dayOfWeek = timeInStoreTz.getDay();
				const dayNames = [
					"Sunday",
					"Monday",
					"Tuesday",
					"Wednesday",
					"Thursday",
					"Friday",
					"Saturday",
				] as const;
				const dayName = dayNames[dayOfWeek];

				// Get hours for this day
				const dayHours = schedule[dayName];
				if (!dayHours || dayHours === "closed") {
					return false;
				}

				// Check if time falls within any time range
				const checkHour = timeInStoreTz.getHours();
				const checkMinute = timeInStoreTz.getMinutes();
				const checkTimeMinutes = checkHour * 60 + checkMinute;

				for (const range of dayHours) {
					const [fromHour, fromMinute] = range.from.split(":").map(Number);
					const [toHour, toMinute] = range.to.split(":").map(Number);

					const fromMinutes = fromHour * 60 + fromMinute;
					const toMinutes = toHour * 60 + toMinute;

					// Check if time falls within range
					if (checkTimeMinutes >= fromMinutes && checkTimeMinutes < toMinutes) {
						return true;
					}

					// Handle range spanning midnight (e.g., 22:00 to 02:00)
					if (fromMinutes > toMinutes) {
						if (
							checkTimeMinutes >= fromMinutes ||
							checkTimeMinutes < toMinutes
						) {
							return true;
						}
					}
				}

				return false;
			} catch (error) {
				// If parsing fails, assume facility is available
				console.error("Failed to parse facility business hours:", error);
				return true;
			}
		},
		[],
	);

	const defaultValues = rsvp
		? {
				storeId: rsvp.storeId,
				id: rsvp.id,
				customerId: rsvp.customerId,
				facilityId: rsvp.facilityId || "",
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
			}
		: {
				//default value when create new
				storeId: String(params.storeId),
				id: "",
				customerId: null,
				facilityId:
					storeFacilities && storeFacilities.length > 0
						? storeFacilities[0].id
						: "",
				numOfAdult: 1,
				numOfChild: 0,
				rsvpTime: defaultRsvpTime || getUtcNow(),
				arriveTime: null,
				status: RsvpStatus.Pending,
				message: null,
				alreadyPaid: false,
				confirmedByStore: false,
				confirmedByCustomer: false,
				facilityCost: null,
				pricingRuleId: null,
			};

	// Use createRsvpSchema when isNew, updateRsvpSchema when editing
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

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	};

	// Watch for facilityId and rsvpTime changes to auto-calculate facilityCost
	const facilityId = form.watch("facilityId");
	const rsvpTime = form.watch("rsvpTime");
	const status = form.watch("status");
	const isCompleted = status === RsvpStatus.Completed;

	// Get current user session to check admin role
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user?.role === Role.admin;

	// Only allow editing completed RSVPs if user is admin
	const canEditCompleted = !isCompleted || isAdmin;

	// Filter facilities based on rsvpTime
	// When editing, always include the current facility even if it's not available at the selected time
	const availableFacilities = useMemo(() => {
		if (!storeFacilities) {
			return [];
		}
		if (!rsvpTime || isNaN(rsvpTime.getTime())) {
			return storeFacilities;
		}
		const filtered = storeFacilities.filter((facility: StoreFacility) =>
			isFacilityAvailableAtTime(facility, rsvpTime, storeTimezone),
		);

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

	// Calculate pricing only when dialog is opened
	useEffect(() => {
		if (!dialogOpen) {
			return;
		}

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
					`${process.env.NEXT_PUBLIC_API_URL}/storeAdmin/${params.storeId}/facilities/calculate-pricing`,
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
					form.setValue("facilityCost", result.cost, {
						shouldValidate: false,
					});
				}
				if (result.pricingRuleId) {
					form.setValue("pricingRuleId", result.pricingRuleId, {
						shouldValidate: false,
					});
				}
			} catch (error) {
				// Silently fail - pricing calculation is optional
				console.error("Failed to calculate facility pricing:", error);
			}
		};

		calculatePricing();
	}, [dialogOpen, facilityId, rsvpTime, params.storeId, form]);

	const handleSuccess = (updatedRsvp: Rsvp) => {
		if (isEditMode) {
			onUpdated?.(updatedRsvp);
		} else {
			onCreated?.(updatedRsvp);
		}

		toastSuccess({
			title: t("rsvp") + " " + t(isEditMode ? "updated" : "created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

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
				const result = await createRsvpAction(String(params.storeId), {
					customerId: values.customerId || null,
					facilityId: values.facilityId,
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
					handleSuccess(result.data.rsvp);
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

				const result = await updateRsvpAction(String(params.storeId), {
					id: rsvpId,
					customerId: values.customerId || null,
					facilityId: values.facilityId,
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
					handleSuccess(result.data.rsvp);
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
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("edit") + " " + t("rsvp")
							: t("create") + " " + t("rsvp")}
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground">
						{isCompleted && !isAdmin
							? t("rsvp_completed_readonly") ||
								"This reservation is completed and cannot be edited."
							: t("rsvp_edit_descr")}
					</DialogDescription>
				</DialogHeader>

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
											defaultValue={
												field.value ? String(field.value) : undefined
											}
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
													field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) =>
													field.onChange(
														Number.parseInt(event.target.value) || 1,
													)
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
													field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) =>
													field.onChange(
														Number.parseInt(event.target.value) || 0,
													)
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
							render={({ field }) => (
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
											value={
												field.value ? formatDateTimeLocal(field.value) : ""
											}
											onChange={(event) => {
												const value = event.target.value;
												if (value) {
													field.onChange(parseDateTimeLocal(value));
												}
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
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
												!canEditCompleted ||
												loading ||
												form.formState.isSubmitting
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
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("rsvp_facility")}{" "}
										<span className="text-destructive">*</span>
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
												onValueChange={(facility) => {
													field.onChange(facility?.id || "");
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
																			"No facilities available at selected time",
																		)
																	: t("No facilities available");
														})()
													: rsvpTime
														? t("No facilities available at selected time")
														: t("No facilities available")}
											</div>
										)}
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
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

						{/** Already Paid */}
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="alreadyPaid"
								render={({ field }) => {
									const isCancelled =
										form.watch("status") === RsvpStatus.Cancelled;
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
											<FormDescription className="text-xs text-muted-foreground font-mono">
												{t("rsvp_already_paid_descr")}
											</FormDescription>
										</FormItem>
									);
								}}
							/>
						</div>

						<Separator />

						<FormField
							control={form.control}
							name="confirmedByStore"
							render={({ field }) => {
								const isCancelled =
									form.watch("status") === RsvpStatus.Cancelled;
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
										<FormLabel>{t("rsvp_confirmed_by_store")}</FormLabel>
										<FormMessage />
										<FormDescription className="text-xs text-muted-foreground font-mono">
											{t("rsvp_confirmed_by_store_descr")}
										</FormDescription>
									</FormItem>
								);
							}}
						/>

						{form.watch("confirmedByStore") && (
							<div className="text-xs text-muted-foreground font-mono">
								{t("rsvp_section_notification")}
							</div>
						)}

						<Separator />

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

						<FormField
							control={form.control}
							name="confirmedByCustomer"
							render={({ field }) => {
								const isCancelled =
									form.watch("status") === RsvpStatus.Cancelled;
								const isNoShow = form.watch("status") === RsvpStatus.NoShow;
								const isDisabled = isCancelled || isNoShow;
								return (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<input
												type="checkbox"
												checked={field.value}
												onChange={(e) => {
													const checked = e.target.checked;
													field.onChange(checked);

													if (checked) {
														// When confirmed by customer:
														// 1. Set arriveTime to now
														form.setValue("arriveTime", getUtcNow());
														// 2. Set status to Completed
														form.setValue("status", RsvpStatus.Completed);
													} else {
														// When unchecked, clear arriveTime
														form.setValue("arriveTime", null);
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
										<FormLabel>{t("rsvp_confirmed_by_customer")}</FormLabel>
										<FormMessage />
										<FormDescription className="text-xs text-muted-foreground font-mono">
											{t("rsvp_confirmed_by_customer_descr")}
										</FormDescription>
									</FormItem>
								);
							}}
						/>

						<Separator />

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => {
								const isCancelled = field.value === RsvpStatus.Cancelled;
								const isNoShow = field.value === RsvpStatus.NoShow;
								return (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<input
												type="checkbox"
												checked={isCancelled}
												onChange={(e) => {
													if (e.target.checked) {
														// Set status to Cancelled and uncheck other status checkboxes
														field.onChange(RsvpStatus.Cancelled);
														form.setValue("alreadyPaid", false);
														form.setValue("confirmedByStore", false);
														form.setValue("confirmedByCustomer", false);
													} else {
														// Uncheck cancelled, reset to Pending
														field.onChange(RsvpStatus.Pending);
													}
												}}
												disabled={
													!canEditCompleted ||
													loading ||
													form.formState.isSubmitting ||
													isNoShow
												}
												className="h-5 w-5 sm:h-4 sm:w-4"
											/>
										</FormControl>
										<FormLabel>{t("rsvp_cancelled")}</FormLabel>
										<FormMessage />
										<FormDescription className="text-xs text-muted-foreground font-mono">
											{t("rsvp_cancelled_descr")}
										</FormDescription>
									</FormItem>
								);
							}}
						/>

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => {
								const isCancelled = field.value === RsvpStatus.Cancelled;
								const isNoShow = field.value === RsvpStatus.NoShow;
								return (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<input
												type="checkbox"
												checked={isNoShow}
												onChange={(e) => {
													if (e.target.checked) {
														// Set status to NoShow and uncheck other status checkboxes
														field.onChange(RsvpStatus.NoShow);
														form.setValue("alreadyPaid", false);
														form.setValue("confirmedByStore", false);
														form.setValue("confirmedByCustomer", false);
													} else {
														// Uncheck no-show, reset to Pending
														field.onChange(RsvpStatus.Pending);
													}
												}}
												disabled={
													!canEditCompleted ||
													loading ||
													form.formState.isSubmitting ||
													isCancelled
												}
												className="h-5 w-5 sm:h-4 sm:w-4"
											/>
										</FormControl>
										<FormLabel>{t("rsvp_no_show")}</FormLabel>
										<FormMessage />
										<FormDescription className="text-xs text-muted-foreground font-mono">
											{t("rsvp_no_show_descr")}
										</FormDescription>
									</FormItem>
								);
							}}
						/>

						<DialogFooter className="flex w-full justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
							>
								{isEditMode ? t("save") : t("create")}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("cancel")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

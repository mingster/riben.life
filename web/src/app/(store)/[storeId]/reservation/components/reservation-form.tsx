"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendarCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

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
import { useTranslation } from "@/app/i18n/client";
import { FacilityCombobox } from "@/components/combobox-facility";
import { toastError, toastSuccess } from "@/components/toaster";
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, StoreFacility, User } from "@/types";
import {
	convertToUtc,
	epochToDate,
	formatUtcDateToDateTimeLocal,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import type { RsvpSettings, StoreSettings } from "@prisma/client";
import { SlotPicker } from "./slot-picker";

interface ReservationFormProps {
	storeId: string;
	rsvpSettings: RsvpSettings | null;
	storeSettings?: StoreSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	// Create mode props
	defaultRsvpTime?: Date;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	// Edit mode props
	rsvp?: Rsvp;
	rsvps?: Rsvp[];
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
	// Common props
	hideCard?: boolean;
	storeTimezone?: string;
}

export function ReservationForm({
	storeId,
	rsvpSettings,
	storeSettings,
	facilities,
	user,
	defaultRsvpTime,
	onReservationCreated,
	rsvp,
	rsvps = [],
	onReservationUpdated,
	hideCard = false,
	storeTimezone = "Asia/Taipei",
}: ReservationFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Determine if we're in edit mode
	const isEditMode = Boolean(rsvp);

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
			} catch {
				// If parsing fails, assume facility is available
				return true;
			}
		},
		[storeTimezone],
	);

	// Default values - different for create vs edit
	const defaultValues = useMemo(() => {
		if (isEditMode && rsvp) {
			// Edit mode: use existing RSVP data
			let rsvpTime: Date;
			if (rsvp.rsvpTime instanceof Date) {
				rsvpTime = rsvp.rsvpTime;
			} else if (rsvp.rsvpTime) {
				// Convert BigInt epoch or number epoch to Date
				const epochValue =
					typeof rsvp.rsvpTime === "number"
						? BigInt(rsvp.rsvpTime)
						: typeof rsvp.rsvpTime === "bigint"
							? rsvp.rsvpTime
							: BigInt(rsvp.rsvpTime);
				rsvpTime = epochToDate(epochValue) ?? new Date();
				// Validate date
				if (Number.isNaN(rsvpTime.getTime())) {
					rsvpTime = new Date();
				}
			} else {
				rsvpTime = new Date();
			}

			return {
				id: rsvp.id,
				facilityId:
					rsvp.facilityId || (facilities.length > 0 ? facilities[0].id : ""),
				numOfAdult: rsvp.numOfAdult,
				numOfChild: rsvp.numOfChild,
				rsvpTime,
				message: rsvp.message || "",
			} as UpdateReservationInput;
		} else {
			// Create mode: use default values
			return {
				storeId,
				customerId: user?.id || null,
				email: user?.email || "",
				phone: "",
				facilityId: facilities.length > 0 ? facilities[0].id : "",
				numOfAdult: 1,
				numOfChild: 0,
				rsvpTime: defaultRsvpTime || new Date(),
				message: "",
			} as CreateReservationInput;
		}
	}, [isEditMode, rsvp, storeId, user, defaultRsvpTime, facilities]);

	// Use appropriate schema based on mode
	const schema = isEditMode ? updateReservationSchema : createReservationSchema;

	// Form type: union of both input types
	type FormInput = CreateReservationInput | UpdateReservationInput;

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: isEditMode ? "onBlur" : "onChange",
	});

	// Watch rsvpTime to filter facilities
	const rsvpTime = form.watch("rsvpTime");

	// Filter facilities based on rsvpTime
	const availableFacilities = useMemo(() => {
		if (!rsvpTime || isNaN(rsvpTime.getTime())) {
			return facilities;
		}
		return facilities.filter((facility) =>
			isFacilityAvailableAtTime(facility, rsvpTime, storeTimezone),
		);
	}, [facilities, rsvpTime, storeTimezone, isFacilityAvailableAtTime]);

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

	async function onSubmit(data: FormInput) {
		// Check if reservations are accepted (only for create mode)
		if (!isEditMode && rsvpSettings && !rsvpSettings.acceptReservation) {
			toastError({
				title: t("Error"),
				description: t("Reservations are not currently accepted"),
			});
			return;
		}
		setIsSubmitting(true);

		try {
			let result;
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
					toastSuccess({
						description: t("reservation_updated"),
					});
					if (result?.data?.rsvp) {
						onReservationUpdated?.(result.data.rsvp as Rsvp);
					}
				} else {
					toastSuccess({
						description: t("reservation_created"),
					});
					// Reset form after successful submission (create mode only)
					form.reset(defaultValues as CreateReservationInput);
					if (result?.data?.rsvp) {
						onReservationCreated?.(result.data.rsvp as Rsvp);
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

	// Check if prepaid is required (create mode only)
	const prepaidRequired = rsvpSettings?.prepaidRequired ?? false;
	const requiresLogin = !isEditMode && prepaidRequired && !user;
	const acceptReservation = rsvpSettings?.acceptReservation ?? true; // Default to true
	// Note: isBlacklisted is not passed to ReservationForm, so we rely on server-side validation
	// The form will show an error message if the server rejects due to blacklist
	const canCreateReservation = isEditMode || acceptReservation; // Allow edit, but check acceptReservation for create

	const formContent = (
		<>
			{requiresLogin && (
				<div className="mb-4 space-y-3 rounded-md bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
					<p>{t("reservation_prepaid_required")}</p>
					<Link
						href={`/signIn/?callbackUrl=/${params.storeId}/reservation`}
						className="inline-block"
					>
						<Button
							type="button"
							variant="default"
							className="w-full sm:w-auto"
						>
							{t("signin")} {t("or")} {t("signUp")}
						</Button>
					</Link>
				</div>
			)}

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					{/* Date and Time */}
					<FormField
						control={form.control}
						name="rsvpTime"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									{t("rsvp_time")} <span className="text-destructive">*</span>
								</FormLabel>
								<FormControl>
									{isEditMode ? (
										// Edit mode: Use SlotPicker
										<div className="border rounded-lg p-4">
											<SlotPicker
												existingReservations={rsvps}
												rsvpSettings={rsvpSettings}
												storeSettings={storeSettings || null}
												storeTimezone={storeTimezone}
												currentRsvpId={rsvp?.id}
												selectedDateTime={field.value || null}
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
										// Create mode: Use datetime-local input
										<Input
											type="datetime-local"
											disabled={isSubmitting}
											value={
												field.value
													? (() => {
															try {
																// Ensure we have a proper Date object
																const utcDate =
																	field.value instanceof Date
																		? field.value
																		: new Date(field.value);

																// Validate date
																if (Number.isNaN(utcDate.getTime())) {
																	return "";
																}

																// Use formatUtcDateToDateTimeLocal to correctly format UTC date in store timezone
																return formatUtcDateToDateTimeLocal(
																	utcDate,
																	storeTimezone,
																);
															} catch {
																// Silently handle formatting errors
																return "";
															}
														})()
													: ""
											}
											onChange={(e) => {
												// Convert datetime-local string (interpreted as store timezone) to UTC
												const value = e.target.value;
												if (value) {
													const utcDate = convertToUtc(value, storeTimezone);
													field.onChange(utcDate);
												}
											}}
										/>
									)}
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Number of Adults and Children */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
											min={1}
											disabled={isSubmitting}
											{...field}
											onChange={(e) => {
												field.onChange(Number.parseInt(e.target.value, 10));
											}}
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
											min={0}
											disabled={isSubmitting}
											{...field}
											onChange={(e) => {
												field.onChange(Number.parseInt(e.target.value, 10));
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					{/* Facility Selection */}
					<FormField
						control={form.control}
						name="facilityId"
						render={({ field }) => {
							const selectedFacility = field.value
								? availableFacilities.find((f) => f.id === field.value) || null
								: null;

							return (
								<FormItem>
									<FormLabel>
										{t("rsvp_facility")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<div className="space-y-2">
											{availableFacilities.length > 0 ? (
												<>
													<FacilityCombobox
														storeFacilities={availableFacilities}
														disabled={isSubmitting}
														defaultValue={selectedFacility}
														onValueChange={(facility) => {
															field.onChange(facility?.id || "");
														}}
													/>
													{selectedFacility && selectedFacility.defaultCost && (
														<div className="text-sm text-muted-foreground">
															{t("rsvp_facility_cost")}:{" "}
															{typeof selectedFacility.defaultCost === "number"
																? selectedFacility.defaultCost.toFixed(2)
																: Number(selectedFacility.defaultCost).toFixed(
																		2,
																	)}
														</div>
													)}
												</>
											) : (
												<div className="text-sm text-destructive">
													{rsvpTime
														? t("No facilities available at selected time")
														: t("No facilities available")}
												</div>
											)}
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							);
						}}
					/>

					{/* Contact Information - Only in create mode when user is not logged in */}
					{!isEditMode && !user && (
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("email")}</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder={t("Enter_your_email")}
												disabled={isSubmitting}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="phone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("phone")}</FormLabel>
										<FormControl>
											<Input
												type="tel"
												placeholder={t("Enter_your_phone")}
												disabled={isSubmitting}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}

					{/* Message/Notes */}
					<FormField
						control={form.control}
						name="message"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("rsvp_message")}</FormLabel>
								<FormControl>
									<Textarea
										placeholder={t("Special_requests_or_notes")}
										disabled={isSubmitting}
										{...field}
										value={field.value || ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* Submit Button */}
					<Button
						type="submit"
						disabled={
							isSubmitting ||
							requiresLogin ||
							availableFacilities.length === 0 ||
							!canCreateReservation
						}
						className="w-full"
					>
						{isSubmitting
							? isEditMode
								? t("updating")
								: t("Submitting")
							: isEditMode
								? t("update_reservation")
								: t("create_Reservation")}
					</Button>

					{requiresLogin && (
						<p className="text-sm text-muted-foreground text-center">
							{t("Please_sign_in_to_make_reservation")}
						</p>
					)}
					{!isEditMode && !acceptReservation && (
						<p className="text-sm text-destructive text-center">
							{t("Reservations are not currently accepted")}
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

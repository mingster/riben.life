"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendarCheck } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
	formatUtcDateToDateTimeLocal,
	getDateInTz,
	getOffsetHours,
	getUtcNow,
} from "@/utils/datetime-utils";
import { RsvpStatus } from "@/types/enum";
import { SlotPicker } from "./slot-picker";
import { Separator } from "@/components/ui/separator";
import { calculateCancelPolicyInfo } from "@/utils/rsvp-cancel-policy-utils";
import { RsvpCancelPolicyInfo } from "@/components/rsvp-cancel-policy-info";
import { clientLogger } from "@/lib/client-logger";

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
	const params = useParams();
	const router = useRouter();
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

			try {
				const schedule = JSON.parse(hoursJson) as {
					Monday?: Array<{ from: string; to: string }> | "closed";
					Tuesday?: Array<{ from: string; to: string }> | "closed";
					Wednesday?: Array<{ from: string; to: string }> | "closed";
					Thursday?: Array<{ from: string; to: string }> | "closed";
					Friday?: Array<{ from: string; to: string }> | "closed";
					Saturday?: Array<{ from: string; to: string }> | "closed";
					Sunday?: Array<{ from: string; to: string }> | "closed";
				};

				// Convert UTC time to store timezone for checking
				const offsetHours = getOffsetHours(storeTimezone);
				const timeInStoreTz = getDateInTz(rsvpTime, offsetHours);

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
					return errorMessage;
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
						return null; // Valid time
					}

					// Handle range spanning midnight (e.g., 22:00 to 02:00)
					if (fromMinutes > toMinutes) {
						if (
							checkTimeMinutes >= fromMinutes ||
							checkTimeMinutes < toMinutes
						) {
							return null; // Valid time
						}
					}
				}

				// Time is not within any range
				return errorMessage;
			} catch (error) {
				// If parsing fails, allow the time (graceful degradation)
				console.error("Failed to parse hours JSON:", error);
				return null;
			}
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
			// Only include email and phone for anonymous users (when user is not logged in)
			const isAnonymous = !user;
			return {
				storeId,
				customerId: user?.id || null,
				email: isAnonymous ? "" : undefined,
				phone: isAnonymous ? "" : undefined,
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
	const facilityId = form.watch("facilityId");

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
					let existingRsvpTime: bigint;
					if (r.rsvpTime instanceof Date) {
						existingRsvpTime = BigInt(r.rsvpTime.getTime());
					} else if (typeof r.rsvpTime === "number") {
						existingRsvpTime = BigInt(r.rsvpTime);
					} else if (typeof r.rsvpTime === "bigint") {
						existingRsvpTime = r.rsvpTime;
					} else {
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
				let existingRsvpTime: bigint;
				if (existingRsvp.rsvpTime instanceof Date) {
					existingRsvpTime = BigInt(existingRsvp.rsvpTime.getTime());
				} else if (typeof existingRsvp.rsvpTime === "number") {
					existingRsvpTime = BigInt(existingRsvp.rsvpTime);
				} else if (typeof existingRsvp.rsvpTime === "bigint") {
					existingRsvpTime = existingRsvp.rsvpTime;
				} else {
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

	async function onSubmit(data: FormInput) {
		// Check if reservations are accepted (only for create mode)
		if (!isEditMode && rsvpSettings && !rsvpSettings.acceptReservation) {
			toastError({
				title: t("Error"),
				description: t("rsvp_not_currently_accepted"),
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
					toastSuccess({
						description: t("reservation_updated"),
					});
					if (result?.data?.rsvp) {
						onReservationUpdated?.(result.data.rsvp as Rsvp);

						// if associated order is still unpaid, bring user to checkout page
						if (
							result?.data?.rsvp?.orderId &&
							!result?.data?.rsvp?.alreadyPaid
						) {
							router.push(`/checkout/${result?.data?.rsvp?.orderId}`);
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
							requiresSignIn?: boolean;
						};
						const orderId = data.orderId;
						const requiresSignIn = data.requiresSignIn ?? false;

						if (orderId) {
							// Prepaid required: redirect to checkout page
							if (requiresSignIn) {
								// Anonymous user: redirect to sign-in first, then to checkout
								const callbackUrl = `/checkout/${orderId}`;
								router.push(
									`/signIn?callbackUrl=${encodeURIComponent(callbackUrl)}`,
								);
							} else {
								// Logged-in user: redirect directly to checkout
								router.push(`/checkout/${orderId}`);
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
								const rsvpTimeDate = data.rsvp.rsvpTime
									? epochToDate(
											typeof data.rsvp.rsvpTime === "number"
												? BigInt(data.rsvp.rsvpTime)
												: data.rsvp.rsvpTime instanceof Date
													? BigInt(data.rsvp.rsvpTime.getTime())
													: data.rsvp.rsvpTime,
										)
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
							onReservationCreated?.(data.rsvp);
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

	// Prepaid requirement derived from percentage and cost
	const minPrepaidPercentage = rsvpSettings?.minPrepaidPercentage ?? 0;
	const prepaidRequired =
		(minPrepaidPercentage ?? 0) > 0 && (rsvpSettings?.defaultCost ?? 0) > 0;
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
						href={`/signIn/?callbackUrl=/s/${params.storeId}/reservation`}
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
										{isEditMode ? (
											// Edit mode: Use SlotPicker
											<div className="border rounded-lg p-4">
												<SlotPicker
													existingReservations={existingReservations}
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
											// Create mode: Display date/time (read-only)
											<div className="flex h-10 w-full rounded-md px-3 py-2 text-sm ring-offset-background">
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

															// Format UTC date in store timezone for display
															const formatted = formatUtcDateToDateTimeLocal(
																utcDate,
																storeTimezone,
															);
															return (
																<span>{formatted || "No date selected"}</span>
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
														disabled={isSubmitting || isEditMode}
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

					{/* Contact Information - Only show for anonymous users (not logged in) */}
					{!isEditMode && !user && (
						<div className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("email")} <span className="text-destructive">*</span>
										</FormLabel>
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
										<FormLabel>
											{t("phone")} <span className="text-destructive">*</span>
										</FormLabel>
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
								currency={storeCurrency}
								useCustomerCredit={useCustomerCredit}
								creditExchangeRate={creditExchangeRate}
							/>
						)}
					</div>

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
							{t("rsvp_please_sign_in")}
						</p>
					)}
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

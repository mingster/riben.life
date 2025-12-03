"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendarCheck } from "@tabler/icons-react";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";

import { createReservationAction } from "@/actions/store/reservation/create-reservation";
import {
	createReservationSchema,
	type CreateReservationInput,
} from "@/actions/store/reservation/create-reservation.validation";
import { useTranslation } from "@/app/i18n/client";
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
import { FacilityCombobox } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/facility/components/combobox-facility";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreFacility, User, Rsvp } from "@/types";
import type { RsvpSettings } from "@prisma/client";
import {
	getDateInTz,
	getOffsetHours,
	convertStoreTimezoneToUtc,
} from "@/utils/datetime-utils";
import { format } from "date-fns";

interface ReservationFormProps {
	storeId: string;
	rsvpSettings: RsvpSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	defaultRsvpTime?: Date;
	onReservationCreated?: (newRsvp: Rsvp) => void;
	hideCard?: boolean;
	storeTimezone?: string;
}

export function ReservationForm({
	storeId,
	rsvpSettings,
	facilities,
	user,
	defaultRsvpTime,
	onReservationCreated,
	hideCard = false,
	storeTimezone = "Asia/Taipei",
}: ReservationFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const params = useParams();
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Default values
	const defaultValues: CreateReservationInput = useMemo(
		() => ({
			storeId,
			userId: user?.id || null,
			email: user?.email || "",
			phone: "",
			facilityId: null,
			numOfAdult: 1,
			numOfChild: 0,
			rsvpTime: defaultRsvpTime || new Date(),
			message: "",
		}),
		[storeId, user, defaultRsvpTime],
	);

	const form = useForm<CreateReservationInput>({
		resolver: zodResolver(createReservationSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	// Update form when defaultRsvpTime changes
	useEffect(() => {
		if (defaultRsvpTime) {
			form.setValue("rsvpTime", defaultRsvpTime);
		}
	}, [defaultRsvpTime, form]);

	async function onSubmit(data: CreateReservationInput) {
		setIsSubmitting(true);

		try {
			// Pass Date object directly - safe-action will handle serialization
			const result = await createReservationAction(data);

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
			} else {
				toastSuccess({
					description: t("reservation_created"),
				});
				// Reset form after successful submission
				form.reset(defaultValues);
				// Call callback with the created reservation if provided
				if (result?.data?.rsvp) {
					onReservationCreated?.(result.data.rsvp as Rsvp);
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

	// Check if prepaid is required
	const prepaidRequired = rsvpSettings?.prepaidRequired ?? false;
	const requiresLogin = prepaidRequired && !user;

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
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
											disabled={isSubmitting}
											value={
												field.value
													? (() => {
														try {
															// Convert UTC date to store timezone for display
															const utcDate =
																field.value instanceof Date
																	? field.value
																	: new Date(field.value);

															// Validate date
															if (Number.isNaN(utcDate.getTime())) {
																return "";
															}

															const storeTzDate = getDateInTz(
																utcDate,
																getOffsetHours(storeTimezone),
															);

															// Validate converted date
															if (Number.isNaN(storeTzDate.getTime())) {
																return "";
															}

															return format(storeTzDate, "yyyy-MM-dd'T'HH:mm");
														} catch (error) {
															console.error("Error formatting date:", error);
															return "";
														}
													})()
													: ""
											}
											onChange={(e) => {
												// Convert datetime-local string (interpreted as store timezone) to UTC
												const utcDate = convertStoreTimezoneToUtc(
													e.target.value,
													storeTimezone,
												);
												field.onChange(utcDate);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

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

					{/* Facility Selection (if available) */}
					{facilities.length > 0 && (
						<FormField
							control={form.control}
							name="facilityId"
							render={({ field }) => {
								const selectedFacility = field.value
									? facilities.find((f) => f.id === field.value) || null
									: null;

								return (
									<FormItem>
										<FormLabel>{t("rsvp_facility")}</FormLabel>
										<FormControl>
											<div className="space-y-2">
												<div className="flex items-center gap-2">
													<FacilityCombobox
														storeFacilities={facilities}
														disabled={isSubmitting}
														defaultValue={selectedFacility}
														onValueChange={(facility) => {
															field.onChange(facility?.id || null);
														}}
													/>
													{selectedFacility && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => {
																field.onChange(null);
															}}
															disabled={isSubmitting}
															className="h-9 text-xs"
														>
															{t("No_preference")}
														</Button>
													)}
												</div>
												{selectedFacility && selectedFacility.defaultCost && (
													<div className="text-sm text-muted-foreground">
														{t("rsvp_facility_cost")}:{" "}
														{typeof selectedFacility.defaultCost === "number"
															? selectedFacility.defaultCost.toFixed(2)
															: Number(selectedFacility.defaultCost).toFixed(2)}
													</div>
												)}
											</div>
										</FormControl>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
					)}

					{/* Contact Information */}
					{!user && (
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
						disabled={isSubmitting || requiresLogin}
						className="w-full"
					>
						{isSubmitting ? t("Submitting") : t("create_Reservation")}
					</Button>

					{requiresLogin && (
						<p className="text-sm text-muted-foreground text-center">
							{t("Please_sign_in_to_make_reservation")}
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
					{t("create_Reservation")}
				</CardTitle>
				<CardDescription>{t("create_Reservation_description")}</CardDescription>
			</CardHeader>
			<CardContent>{formContent}</CardContent>
		</Card>
	);
}

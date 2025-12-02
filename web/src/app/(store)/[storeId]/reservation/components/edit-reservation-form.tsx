"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconCalendarCheck } from "@tabler/icons-react";
import { useParams } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";

import { updateReservationAction } from "@/actions/store/reservation/update-reservation";
import {
	updateReservationSchema,
	type UpdateReservationInput,
} from "@/actions/store/reservation/update-reservation.validation";
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
import { getDateInTz } from "@/utils/datetime-utils";
import { format } from "date-fns";

interface EditReservationFormProps {
	storeId: string;
	rsvpSettings: RsvpSettings | null;
	facilities: StoreFacility[];
	user: User | null;
	rsvp: Rsvp;
	onReservationUpdated?: (updatedRsvp: Rsvp) => void;
	hideCard?: boolean;
	storeTimezone?: number;
}

export function EditReservationForm({
	storeId,
	rsvpSettings,
	facilities,
	user,
	rsvp,
	onReservationUpdated,
	hideCard = false,
	storeTimezone = 8,
}: EditReservationFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	// Default values from existing RSVP
	const defaultValues: UpdateReservationInput = useMemo(
		() => ({
			id: rsvp.id,
			facilityId: rsvp.facilityId,
			numOfAdult: rsvp.numOfAdult,
			numOfChild: rsvp.numOfChild,
			rsvpTime:
				rsvp.rsvpTime instanceof Date ? rsvp.rsvpTime : new Date(rsvp.rsvpTime),
			message: rsvp.message || "",
		}),
		[rsvp],
	);

	const form = useForm<UpdateReservationInput>({
		resolver: zodResolver(updateReservationSchema) as any,
		defaultValues,
		mode: "onChange",
	});

	// Update form when rsvp changes
	useEffect(() => {
		form.reset(defaultValues);
	}, [rsvp, form, defaultValues]);

	async function onSubmit(data: UpdateReservationInput) {
		setIsSubmitting(true);

		try {
			const result = await updateReservationAction(data);

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
			} else {
				toastSuccess({
					description: t("reservation_updated"),
				});
				// Call callback with the updated reservation if provided
				if (result?.data?.rsvp) {
					onReservationUpdated?.(result.data.rsvp as Rsvp);
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
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<FormField
							control={form.control}
							name="rsvpTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("rsvp_time")}</FormLabel>
									<FormControl>
										<Input
											type="datetime-local"
											disabled={isSubmitting}
											value={
												field.value
													? (() => {
															// Convert UTC date to store timezone for display
															const utcDate =
																field.value instanceof Date
																	? field.value
																	: new Date(field.value);
															const storeTzDate = getDateInTz(
																utcDate,
																storeTimezone,
															);
															return format(storeTzDate, "yyyy-MM-dd'T'HH:mm");
														})()
													: ""
											}
											onChange={(e) => {
												field.onChange(new Date(e.target.value));
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
									<FormLabel>{t("rsvp_num_of_adult")}</FormLabel>
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
					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isSubmitting ? t("updating") : t("update_reservation")}
					</Button>
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
					{t("edit_reservation")}
				</CardTitle>
				<CardDescription>{t("edit_reservation_description")}</CardDescription>
			</CardHeader>
			<CardContent>{formContent}</CardContent>
		</Card>
	);
}

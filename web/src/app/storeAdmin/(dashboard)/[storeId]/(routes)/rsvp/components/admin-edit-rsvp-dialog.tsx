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
import type { RsvpColumn } from "../history/rsvp-column";
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

interface EditRsvpDialogProps {
	rsvp?: RsvpColumn | null;
	isNew?: boolean;
	defaultRsvpTime?: Date;
	trigger?: React.ReactNode;
	onCreated?: (rsvp: RsvpColumn) => void;
	onUpdated?: (rsvp: RsvpColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

// Helper to format Date to datetime-local string
const formatDateTimeLocal = (date: Date): string => {
	return format(date, "yyyy-MM-dd'T'HH:mm");
};

// Helper to parse datetime-local string to Date
const parseDateTimeLocal = (value: string): Date => {
	return new Date(value);
};

export function AdminEditRsvpDialog({
	rsvp,
	isNew = false,
	defaultRsvpTime,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
}: EditRsvpDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const isEditMode = Boolean(rsvp) && !isNew;

	const defaultValues = rsvp
		? {
				...rsvp,
				rsvpTime: rsvp.rsvpTime,
				arriveTime: rsvp.arriveTime,
			}
		: {
				storeId: String(params.storeId),
				id: "",
				userId: null,
				facilityId: null,
				numOfAdult: 1,
				numOfChild: 0,
				rsvpTime: defaultRsvpTime || new Date(),
				arriveTime: null,
				status: 0,
				message: null,
				alreadyPaid: false,
				confirmedByStore: false,
				confirmedByCustomer: false,
				facilityCost: null,
				facilityCredit: null,
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

	const handleSuccess = (updatedRsvp: RsvpColumn) => {
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

			if (!isEditMode) {
				const result = await createRsvpAction({
					storeId: String(params.storeId),
					userId: values.userId || null,
					facilityId: values.facilityId || null,
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
					facilityCredit: values.facilityCredit || null,
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

				const result = await updateRsvpAction({
					storeId: String(params.storeId),
					id: rsvpId,
					userId: values.userId || null,
					facilityId: values.facilityId || null,
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
					facilityCredit: values.facilityCredit || null,
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
			<DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("edit") + " " + t("rsvp")
							: t("create") + " " + t("rsvp")}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("edit") + " " + t("rsvp")
							: t("create") + " " + t("rsvp")}
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
						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="numOfAdult"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Number of Adults</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
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
										<FormLabel>Number of Children</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
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

						<FormField
							control={form.control}
							name="rsvpTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Reservation Time</FormLabel>
									<FormControl>
										<Input
											type="datetime-local"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value
													? formatDateTimeLocal(
															field.value instanceof Date
																? field.value
																: new Date(field.value),
														)
													: ""
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
							name="arriveTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Arrival Time (Optional)</FormLabel>
									<FormControl>
										<Input
											type="datetime-local"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value
													? formatDateTimeLocal(
															field.value instanceof Date
																? field.value
																: new Date(field.value),
														)
													: ""
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

						<FormField
							control={form.control}
							name="message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Message (Optional)</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
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

						<div className="grid grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="facilityCost"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Facility Cost (Optional)</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== null && field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) => {
													const value = event.target.value;
													field.onChange(
														value ? Number.parseFloat(value) : null,
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="facilityCredit"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Facility Credit (Optional)</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== null && field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) => {
													const value = event.target.value;
													field.onChange(
														value ? Number.parseFloat(value) : null,
													);
												}}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<FormField
								control={form.control}
								name="alreadyPaid"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<input
												type="checkbox"
												checked={field.value}
												onChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
												className="h-4 w-4"
											/>
										</FormControl>
										<FormLabel>Already Paid</FormLabel>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="confirmedByStore"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<input
												type="checkbox"
												checked={field.value}
												onChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
												className="h-4 w-4"
											/>
										</FormControl>
										<FormLabel>Confirmed by Store</FormLabel>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="confirmedByCustomer"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center space-x-3 space-y-0">
										<FormControl>
											<input
												type="checkbox"
												checked={field.value}
												onChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
												className="h-4 w-4"
											/>
										</FormControl>
										<FormLabel>Confirmed by Customer</FormLabel>
									</FormItem>
								)}
							/>
						</div>

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

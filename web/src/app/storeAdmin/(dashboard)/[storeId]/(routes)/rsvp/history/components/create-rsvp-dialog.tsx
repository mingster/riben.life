"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { createRsvpAction } from "@/actions/storeAdmin/rsvp/create-rsvp";
import {
	type CreateRsvpInput,
	createRsvpSchema,
} from "@/actions/storeAdmin/rsvp/create-rsvp.validation";
import { useTranslation } from "@/app/i18n/client";
import { StoreMembersCombobox } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/combobox-store-members";
import { FormSubmitOverlay } from "@/components/form-submit-overlay";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import type { Rsvp, StoreFacility, User } from "@/types";
import { RsvpMode, RsvpStatus } from "@/types/enum";
import {
	formatUtcDateToDateTimeLocal,
	toBigIntEpochUnknown,
} from "@/utils/datetime-utils";

interface ServiceStaffOption {
	id: string;
	defaultCost: number | null;
	User?: {
		name: string | null;
		email: string | null;
	} | null;
}

interface CreateRsvpDialogProps {
	storeId: string;
	customers: User[];
	facilities: StoreFacility[];
	serviceStaff: ServiceStaffOption[];
	rsvpMode: number;
	storeTimezone: string;
	onCreated: (rsvp: Rsvp) => void;
}

function getDefaultRsvpTime(): Date {
	const date = new Date();
	date.setHours(date.getHours() + 1, 0, 0, 0);
	return date;
}

export function CreateRsvpDialog({
	storeId,
	customers,
	facilities,
	serviceStaff,
	rsvpMode,
	storeTimezone,
	onCreated,
}: CreateRsvpDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [open, setOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const defaultRsvpTime = useMemo(() => getDefaultRsvpTime(), []);
	const form = useForm<CreateRsvpInput>({
		resolver: zodResolver(createRsvpSchema) as Resolver<CreateRsvpInput>,
		defaultValues: {
			customerId: null,
			facilityId: null,
			serviceStaffId: null,
			numOfAdult: 1,
			numOfChild: 0,
			rsvpTime: defaultRsvpTime,
			arriveTime: null,
			status: RsvpStatus.Ready,
			message: "",
			alreadyPaid: false,
			confirmedByStore: true,
			confirmedByCustomer: false,
			facilityCost: null,
			pricingRuleId: null,
		},
		mode: "onChange",
	});

	const shouldShowFacility =
		rsvpMode === RsvpMode.FACILITY || rsvpMode === RsvpMode.PERSONNEL;
	const shouldShowServiceStaff = rsvpMode === RsvpMode.PERSONNEL;

	async function onSubmit(data: CreateRsvpInput) {
		if (!data.customerId) {
			toastError({
				description: t("select_store_member") || "Select a customer",
			});
			return;
		}

		if (rsvpMode === RsvpMode.FACILITY && !data.facilityId) {
			toastError({
				description: t("rsvp_facility_required") || "Facility is required",
			});
			return;
		}

		if (rsvpMode === RsvpMode.PERSONNEL && !data.serviceStaffId) {
			toastError({
				description:
					t("rsvp_service_staff_required") || "Service staff is required",
			});
			return;
		}

		setIsSubmitting(true);
		try {
			const result = await createRsvpAction(storeId, {
				...data,
				facilityId: data.facilityId || null,
				serviceStaffId: data.serviceStaffId || null,
				message: data.message?.trim() || null,
			});

			if (result?.serverError) {
				toastError({ description: result.serverError });
				return;
			}

			if (result?.data?.rsvp) {
				const rsvp = result.data.rsvp;
				onCreated({
					...rsvp,
					rsvpTime: toBigIntEpochUnknown(rsvp.rsvpTime) ?? BigInt(0),
					createdAt: toBigIntEpochUnknown(rsvp.createdAt) ?? BigInt(0),
					updatedAt: toBigIntEpochUnknown(rsvp.updatedAt) ?? BigInt(0),
				} as Rsvp);
				toastSuccess({
					description: t("reservation_created") || "Reservation created",
				});
				form.reset();
				setOpen(false);
			}
		} catch (err: unknown) {
			toastError({
				description: err instanceof Error ? err.message : String(err),
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button className="h-10 touch-manipulation sm:h-9">
					<IconPlus className="mr-2 h-4 w-4" />
					{t("create_reservation") || "Create reservation"}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("create_reservation") || "Create reservation"}
					</DialogTitle>
					<DialogDescription>
						{t("create_reservation_description") ||
							"Create a reservation for a customer."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="relative space-y-4"
						aria-busy={isSubmitting}
						aria-disabled={isSubmitting}
					>
						<FormSubmitOverlay
							visible={isSubmitting}
							statusText={t("submitting") || "Submitting..."}
						/>
						<FormField
							control={form.control}
							name="customerId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("customer") || "Customer"}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<StoreMembersCombobox
											storeId={storeId}
											storeMembers={customers}
											disabled={isSubmitting}
											defaultValue={field.value ?? undefined}
											onValueChange={(customer) => {
												field.onChange(customer.id);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="rsvpTime"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("rsvp_time") || "Reservation time"}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="datetime-local"
											className="h-10 text-base sm:h-9 sm:text-sm"
											disabled={isSubmitting}
											value={
												field.value
													? formatUtcDateToDateTimeLocal(
															field.value,
															storeTimezone,
														)
													: ""
											}
											onChange={(event) => {
												field.onChange(
													event.target.value
														? new Date(event.target.value)
														: undefined,
												);
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<FormField
								control={form.control}
								name="numOfAdult"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("adult") || "Adult"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												className="h-10 text-base sm:h-9 sm:text-sm"
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
								name="numOfChild"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{t("child") || "Child"}</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={0}
												className="h-10 text-base sm:h-9 sm:text-sm"
												disabled={isSubmitting}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						{shouldShowFacility && (
							<FormField
								control={form.control}
								name="facilityId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("rsvp_facility") || "Facility"}
											{rsvpMode === RsvpMode.FACILITY && (
												<>
													{" "}
													<span className="text-destructive">*</span>
												</>
											)}
										</FormLabel>
										<Select
											disabled={isSubmitting}
											value={field.value || "--"}
											onValueChange={(value) => {
												field.onChange(value === "--" ? null : value);
											}}
										>
											<FormControl>
												<SelectTrigger className="h-10 sm:h-9">
													<SelectValue
														placeholder={
															t("select_facility") || "Select facility"
														}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="--">
													{t("none") || "None"}
												</SelectItem>
												{facilities.map((facility) => (
													<SelectItem key={facility.id} value={facility.id}>
														{facility.facilityName}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{shouldShowServiceStaff && (
							<FormField
								control={form.control}
								name="serviceStaffId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("service_staff") || "Service staff"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<Select
											disabled={isSubmitting}
											value={field.value || "--"}
											onValueChange={(value) => {
												field.onChange(value === "--" ? null : value);
											}}
										>
											<FormControl>
												<SelectTrigger className="h-10 sm:h-9">
													<SelectValue
														placeholder={
															t("select_service_staff") ||
															"Select service staff"
														}
													/>
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="--">
													{t("none") || "None"}
												</SelectItem>
												{serviceStaff.map((staff) => (
													<SelectItem key={staff.id} value={staff.id}>
														{staff.User?.name || staff.User?.email || staff.id}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="message"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("rsvp_message") || "Message"}</FormLabel>
									<FormControl>
										<Textarea
											disabled={isSubmitting}
											className="min-h-[100px] text-base sm:text-sm"
											value={field.value ?? ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								disabled={isSubmitting}
								onClick={() => setOpen(false)}
							>
								{t("cancel") || "Cancel"}
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting
									? t("submitting") || "Submitting..."
									: t("create_reservation") || "Create reservation"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

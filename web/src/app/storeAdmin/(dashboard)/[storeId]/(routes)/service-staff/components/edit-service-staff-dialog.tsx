"use client";

import { createServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/create-service-staff";
import { createServiceStaffSchema } from "@/actions/storeAdmin/serviceStaff/create-service-staff.validation";
import { updateServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/update-service-staff";
import {
	updateServiceStaffSchema,
	type UpdateServiceStaffInput,
} from "@/actions/storeAdmin/serviceStaff/update-service-staff.validation";
import { getStoreMembersAction } from "@/actions/storeAdmin/serviceStaff/get-store-members";
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
import { UserCombobox } from "@/components/user-combobox";
import { MemberRoleCombobox } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/member-role-combobox";
import { useI18n } from "@/providers/i18n-provider";
import type { ServiceStaffColumn } from "../service-staff-column";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { User } from "@/types";
import { Loader } from "@/components/loader";

interface EditServiceStaffDialogProps {
	serviceStaff?: ServiceStaffColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (serviceStaff: ServiceStaffColumn) => void;
	onUpdated?: (serviceStaff: ServiceStaffColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditServiceStaffDialog({
	serviceStaff,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open,
	onOpenChange,
}: EditServiceStaffDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [users, setUsers] = useState<User[]>([]);
	const [loadingUsers, setLoadingUsers] = useState(true);

	const isEditMode = Boolean(serviceStaff) && !isNew;

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	// Fetch store members for user selection
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setLoadingUsers(true);
				const result = await getStoreMembersAction(String(params.storeId), {});
				if (result?.data?.users) {
					setUsers(result.data.users);
				}
			} catch (error) {
				toastError({
					title: t("error_title"),
					description:
						error instanceof Error ? error.message : "Failed to load users",
				});
			} finally {
				setLoadingUsers(false);
			}
		};

		if (dialogOpen) {
			fetchUsers();
		}
	}, [params.storeId, dialogOpen, t]);

	const defaultValues = serviceStaff
		? {
				id: serviceStaff.id,
				userId: serviceStaff.userId,
				memberRole: serviceStaff.memberRole || "staff",
				capacity: serviceStaff.capacity,
				defaultCost: serviceStaff.defaultCost,
				defaultCredit: serviceStaff.defaultCredit,
				defaultDuration: serviceStaff.defaultDuration,
				businessHours: serviceStaff.businessHours,
				description: serviceStaff.description,
			}
		: {
				id: "",
				userId: "",
				memberRole: "staff",
				capacity: 1,
				defaultCost: 0,
				defaultCredit: 0,
				defaultDuration: 60,
				businessHours: null,
				description: null,
			};

	// Use createServiceStaffSchema when isNew, updateServiceStaffSchema when editing
	const schema = useMemo(
		() => (isEditMode ? updateServiceStaffSchema : createServiceStaffSchema),
		[isEditMode],
	);

	// Form input type: UpdateServiceStaffInput when editing, CreateServiceStaffInput when creating
	// Both schemas now include memberRole, so we can use UpdateServiceStaffInput as the base
	type FormInput = Omit<UpdateServiceStaffInput, "id"> & { id?: string };

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

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

	const handleSuccess = (updatedServiceStaff: ServiceStaffColumn) => {
		if (isEditMode) {
			onUpdated?.(updatedServiceStaff);
		} else {
			onCreated?.(updatedServiceStaff);
		}

		toastSuccess({
			title:
				(t("service_staff") || "Service Staff") +
				" " +
				t(isEditMode ? "updated" : "created"),
			description: "",
		});

		resetForm();
		handleOpenChange(false);
	};

	const onSubmit = async (values: FormInput) => {
		try {
			setLoading(true);

			if (!isEditMode) {
				const result = await createServiceStaffAction(String(params.storeId), {
					userId: values.userId,
					memberRole: values.memberRole,
					capacity: values.capacity,
					defaultCost: values.defaultCost,
					defaultCredit: values.defaultCredit,
					defaultDuration: values.defaultDuration,
					businessHours: values.businessHours || null,
					description: values.description || null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.serviceStaff) {
					handleSuccess(result.data.serviceStaff);
				}
			} else {
				const serviceStaffId = serviceStaff?.id;
				if (!serviceStaffId) {
					toastError({
						title: t("error_title"),
						description: "Service staff not found.",
					});
					return;
				}

				const result = await updateServiceStaffAction(String(params.storeId), {
					id: serviceStaffId,
					userId: values.userId,
					memberRole: values.memberRole,
					capacity: values.capacity,
					defaultCost: values.defaultCost,
					defaultCredit: values.defaultCredit,
					defaultDuration: values.defaultDuration,
					businessHours: values.businessHours || null,
					description: values.description || null,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.serviceStaff) {
					handleSuccess(result.data.serviceStaff);
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
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode
							? t("service_staff_edit") || "Edit Service Staff"
							: t("service_staff_add") || "Add Service Staff"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? t("service_staff_edit_descr") ||
								"Edit service staff information"
							: t("service_staff_add_descr") ||
								"Add a new service staff member"}
					</DialogDescription>
				</DialogHeader>

				{loadingUsers ? (
					<Loader />
				) : (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit, (errors) => {
								// Show validation errors when form is invalid
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
								name="userId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("user") || "User"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<UserCombobox
												users={users}
												value={field.value}
												onValueChange={field.onChange}
												disabled={loading || form.formState.isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="memberRole"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("Role") || "Role"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<MemberRoleCombobox
												defaultValue={field.value || "staff"}
												onChange={(value) => field.onChange(value)}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="capacity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("service_staff_capacity") || "Capacity"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) => field.onChange(event.target.value)}
												className="h-10 text-base sm:h-9 sm:text-sm"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="defaultCredit"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("service_staff_default_credit") || "Default Credit"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) => field.onChange(event.target.value)}
												className="h-10 text-base sm:h-9 sm:text-sm"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="defaultCost"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("service_staff_default_cost") || "Default Cost"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) => field.onChange(event.target.value)}
												className="h-10 text-base sm:h-9 sm:text-sm"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="defaultDuration"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("service_staff_default_duration") ||
												"Default Duration (minutes)"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined
														? field.value.toString()
														: ""
												}
												onChange={(event) => field.onChange(event.target.value)}
												className="h-10 text-base sm:h-9 sm:text-sm"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="businessHours"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("business_hours") || "Business Hours"}
										</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono min-h-[100px]"
												placeholder=""
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
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("service_staff_description") || "Description"}
										</FormLabel>
										<FormControl>
											<Textarea
												disabled={loading || form.formState.isSubmitting}
												className="font-mono min-h-[100px]"
												placeholder=""
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

							<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={loading || form.formState.isSubmitting}
									className="w-full sm:w-auto h-10 sm:h-9"
								>
									<span className="text-sm sm:text-xs">{t("cancel")}</span>
								</Button>
								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="w-full sm:w-auto h-10 sm:h-9"
								>
									<span className="text-sm sm:text-xs">
										{isEditMode ? t("save") : t("create")}
									</span>
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}

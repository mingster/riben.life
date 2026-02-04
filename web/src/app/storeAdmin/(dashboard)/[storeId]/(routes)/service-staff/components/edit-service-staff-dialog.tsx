"use client";

import { createServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/create-service-staff";
import { createServiceStaffSchema } from "@/actions/storeAdmin/serviceStaff/create-service-staff.validation";
import { getServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/get-service-staff";
import { getStoreMembersAction } from "@/actions/storeAdmin/serviceStaff/get-store-members";
import { searchUsersAction } from "@/actions/storeAdmin/serviceStaff/search-users";
import { updateServiceStaffAction } from "@/actions/storeAdmin/serviceStaff/update-service-staff";
import {
	updateServiceStaffSchema,
	type UpdateServiceStaffInput,
} from "@/actions/storeAdmin/serviceStaff/update-service-staff.validation";
import { updateUserPropertiesAction } from "@/actions/storeAdmin/serviceStaff/update-user-properties";
import { useTranslation } from "@/app/i18n/client";
import { MemberRoleCombobox } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/customers/components/member-role-combobox";
import { Loader } from "@/components/loader";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserCombobox } from "@/components/user-combobox";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ServiceStaffColumn } from "../service-staff-column";

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
	const [existingServiceStaffNames, setExistingServiceStaffNames] = useState<
		Set<string>
	>(new Set());
	const [userMode, setUserMode] = useState<"select" | "create">("select");
	const [userCreationData, setUserCreationData] = useState<{
		name: string;
		email: string;
		phone: string;
		password: string;
	}>({
		name: "",
		email: "",
		phone: "",
		password: "",
	});

	const isEditMode = Boolean(serviceStaff) && !isNew;
	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	// Fetch store members for user selection, filtering out existing service staff
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setLoadingUsers(true);
				const [usersResult, serviceStaffResult] = await Promise.all([
					getStoreMembersAction(String(params.storeId), {}),
					getServiceStaffAction(String(params.storeId), {}),
				]);

				if (usersResult?.data?.users) {
					let allUsers = usersResult.data.users;

					// Filter out users who are already assigned as service staff
					// But include the current user if we're editing (to allow keeping the same user)
					if (serviceStaffResult?.data?.serviceStaff) {
						const existingServiceStaffUserIds = new Set(
							serviceStaffResult.data.serviceStaff
								.filter((ss) => {
									// When editing, include the current service staff's userId
									if (isEditMode && serviceStaff?.userId) {
										return ss.userId !== serviceStaff.userId;
									}
									return true;
								})
								.map((ss) => ss.userId),
						);

						allUsers = allUsers.filter(
							(user) => !existingServiceStaffUserIds.has(user.id),
						);
					}

					setUsers(allUsers);
				}

				// Store existing service staff names for duplicate name checking
				if (serviceStaffResult?.data?.serviceStaff) {
					const names = new Set(
						serviceStaffResult.data.serviceStaff
							.map((ss: any) => {
								// Access userName from ServiceStaffColumn or User.name from raw data
								const name = ss.userName || ss.User?.name;
								return name?.toLowerCase().trim();
							})
							.filter((name): name is string => Boolean(name)),
					);
					setExistingServiceStaffNames(names);
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
	}, [params.storeId, dialogOpen, t, isEditMode, serviceStaff?.userId]);

	const defaultValues = useMemo(
		() =>
			serviceStaff
				? {
						id: serviceStaff.id,
						userId: serviceStaff.userId,
						memberRole: serviceStaff.memberRole || "staff",
						capacity: serviceStaff.capacity,
						defaultCost: serviceStaff.defaultCost,
						defaultCredit: serviceStaff.defaultCredit,
						defaultDuration: serviceStaff.defaultDuration,
						description: serviceStaff.description,
						receiveStoreNotifications:
							serviceStaff.receiveStoreNotifications ?? true,
						// User property fields (for editing user properties)
						userName: serviceStaff.userName || "",
						userEmail: serviceStaff.userEmail || "",
						userPhone: serviceStaff.userPhoneNumber || "",
						userPassword: "", // Password is not editable
					}
				: {
						id: "",
						userId: "",
						memberRole: "staff",
						capacity: 1,
						defaultCost: 0,
						defaultCredit: 0,
						defaultDuration: 60,
						description: null,
						receiveStoreNotifications: true,
						// User creation fields
						userName: userCreationData.name,
						userEmail: userCreationData.email,
						userPhone: userCreationData.phone,
						userPassword: userCreationData.password,
					},
		[serviceStaff, userCreationData],
	);

	// Build schema based on edit/create mode
	// When editing: updateServiceStaffSchema (doesn't have userId - foreign key is not editable)
	// When creating: createServiceStaffSchema (has userId, but we make it optional for user creation flow)
	const schema = useMemo(() => {
		if (isEditMode) {
			// Edit mode: extend updateServiceStaffSchema with user fields (userId is optional, read-only)
			return updateServiceStaffSchema
				.extend({
					userId: z.string().optional(), // For display only, not editable
					userName: z.string().optional(),
					userEmail: z
						.string()
						.email("Invalid email format")
						.optional()
						.or(z.literal("")),
					userPhone: z.string().optional(),
					userPassword: z.string().optional(),
				})
				.refine(
					(data: { userId?: string; userName?: string }) => {
						// When editing, userName is required if userId is provided (for user properties update)
						if (data.userId && data.userId.trim()) {
							return data.userName && data.userName.trim();
						}
						return true;
					},
					{
						message: "Name is required",
						path: ["userName"],
					},
				);
		} else {
			// Create mode: omit userId from createServiceStaffSchema, then extend with optional userId
			return createServiceStaffSchema
				.omit({ userId: true })
				.extend({
					userId: z.string().optional(), // Will be validated conditionally
					userName: z.string().optional(),
					userEmail: z
						.string()
						.email("Invalid email format")
						.optional()
						.or(z.literal("")),
					userPhone: z.string().optional(),
					userPassword: z.string().optional(),
				})
				.refine(
					(data: {
						userId?: string;
						userName?: string;
						userPassword?: string;
					}) => {
						// If userId is provided, that's valid
						if (data.userId && data.userId.trim()) {
							return true;
						}
						// If userId is not provided, userName and userPassword are required
						if (!data.userId || !data.userId.trim()) {
							const hasUserName = data.userName && data.userName.trim();
							const hasUserPassword =
								data.userPassword && data.userPassword.trim();
							return hasUserName && hasUserPassword;
						}
						return true;
					},
					{
						message:
							"Either select an existing user or type name to find the user",
						path: ["userId"],
					},
				)
				.refine(
					(data: { userId?: string; userName?: string }) => {
						// If userId is not provided, userName is required
						if (!data.userId || !data.userId.trim()) {
							return data.userName && data.userName.trim();
						}
						return true;
					},
					{
						message: "Name is required when creating a new user",
						path: ["userName"],
					},
				)
				.refine(
					(data: { userId?: string; userPassword?: string }) => {
						// If userId is not provided, userPassword is required
						if (!data.userId || !data.userId.trim()) {
							return data.userPassword && data.userPassword.trim();
						}
						return true;
					},
					{
						message: "Password is required when creating a new user",
						path: ["userPassword"],
					},
				);
		}
	}, [isEditMode]);

	// Form input type: UpdateServiceStaffInput when editing, CreateServiceStaffInput when creating
	// Add userId and user creation fields for form handling
	type FormInput = Omit<UpdateServiceStaffInput, "id"> & {
		id?: string;
		userId?: string; // Optional, used for display in edit mode and selection in create mode
		userName?: string;
		userEmail?: string;
		userPhone?: string;
		userPassword?: string;
	};

	const form = useForm<FormInput>({
		resolver: zodResolver(schema) as Resolver<FormInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	// Reset form when defaultValues changes (when serviceStaff changes)
	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const resetForm = useCallback(() => {
		const resetValues = {
			...defaultValues,
			userName: "",
			userEmail: "",
			userPhone: "",
			userPassword: "",
		};
		form.reset(resetValues);
		setUserMode("select");
		setUserCreationData({
			name: "",
			email: "",
			phone: "",
			password: "",
		});
	}, [defaultValues, form]);

	// Trigger validation when userMode changes
	useEffect(() => {
		// Clear userId when switching to "create" mode to trigger validation
		if (userMode === "create") {
			form.setValue("userId", "");
			form.trigger(["userId", "userName", "userPassword"]);
		} else {
			// Clear user creation fields when switching to "select" mode
			form.setValue("userName", "");
			form.setValue("userPassword", "");
			form.setValue("userEmail", "");
			form.setValue("userPhone", "");
			form.clearErrors(["userName", "userPassword", "userEmail", "userPhone"]);
			form.trigger("userId");
		}
	}, [userMode, form]);

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
				let finalUserId = values.userId;

				// If creating a new user, create it first
				if (userMode === "create") {
					const userName = values.userName?.trim() || "";
					const userPassword = values.userPassword?.trim() || "";

					if (!userName || !userPassword) {
						toastError({
							title: t("error_title"),
							description:
								"Name and password are required to create a new user",
						});
						return;
					}

					// Generate email if not provided (similar to customer import logic)
					let finalEmail = values.userEmail?.trim() || "";
					if (!finalEmail) {
						const phoneNumber = values.userPhone?.trim() || "";
						if (phoneNumber) {
							finalEmail = `${phoneNumber.replace(/[^0-9]/g, "")}@phone.riben.life`;
						} else {
							const sanitizedName = userName
								.replace(/[^a-zA-Z0-9]/g, "")
								.toLowerCase()
								.substring(0, 20);
							const timestamp = Date.now();
							const random = Math.random().toString(36).substring(2, 10);
							finalEmail = `${sanitizedName}-${timestamp}-${random}@import.riben.life`;
						}
					}

					const newUser = await authClient.admin.createUser({
						email: finalEmail,
						name: userName,
						password: userPassword,
					});

					finalUserId = newUser.data?.user.id || "";
					if (!finalUserId) {
						toastError({
							title: t("error_title"),
							description: "Failed to create user",
						});
						return;
					}

					// Note: Phone number update would need to be done via a separate API call
					// For now, we'll skip this as it's optional
				}

				if (!finalUserId) {
					toastError({
						title: t("error_title"),
						description: "User is required",
					});
					return;
				}

				const result = await createServiceStaffAction(String(params.storeId), {
					userId: finalUserId,
					memberRole: values.memberRole,
					capacity: values.capacity,
					defaultCost: values.defaultCost,
					defaultCredit: values.defaultCredit,
					defaultDuration: values.defaultDuration,
					description: values.description || null,
					receiveStoreNotifications: values.receiveStoreNotifications,
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

				// Update user properties when editing (name is required, email and phone are optional)
				if (isEditMode && values.userId) {
					const userUpdateResult = await updateUserPropertiesAction(
						String(params.storeId),
						{
							userId: values.userId,
							name: values.userName?.trim() || "",
							email: values.userEmail?.trim(),
							phone: values.userPhone?.trim(),
						},
					);

					if (userUpdateResult?.serverError) {
						toastError({
							title: t("error_title"),
							description: userUpdateResult.serverError,
						});
						return;
					}
				}

				// Update existing ServiceStaff entry
				// Note: userId is not editable (foreign key), so it's not included in the update
				const result = await updateServiceStaffAction(String(params.storeId), {
					id: serviceStaffId,
					memberRole: values.memberRole,
					capacity: values.capacity,
					defaultCost: values.defaultCost,
					defaultCredit: values.defaultCredit,
					defaultDuration: values.defaultDuration,
					description: values.description || null,
					receiveStoreNotifications: values.receiveStoreNotifications,
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
					<div className="relative">
						{(loading || form.formState.isSubmitting) && (
							<div
								className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
								aria-hidden="true"
							>
								<div className="flex flex-col items-center gap-3">
									<Loader />
									<span className="text-sm font-medium text-muted-foreground">
										{t("saving") || "Saving..."}
									</span>
								</div>
							</div>
						)}
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
								{!isEditMode && (
									<div className="space-y-2">
										<Label>
											{t("user") || "User"}{" "}
											<span className="text-destructive">*</span>
										</Label>
										<RadioGroup
											value={userMode}
											onValueChange={(value) => {
												setUserMode(value as "select" | "create");
												if (value === "select") {
													form.setValue("userId", "");
												} else {
													// Reset user creation data when switching to create mode
													setUserCreationData({
														name: "",
														email: "",
														phone: "",
														password: "",
													});
												}
											}}
											className="flex flex-row gap-6"
										>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="select" id="user-select" />
												<label
													htmlFor="user-select"
													className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
												>
													{t("select_existing_user") || "Select Existing User"}
												</label>
											</div>
											<div className="flex items-center space-x-2">
												<RadioGroupItem value="create" id="user-create" />
												<label
													htmlFor="user-create"
													className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
												>
													{t("create_new_user") || "Create New User"}
												</label>
											</div>
										</RadioGroup>
									</div>
								)}
								{/* User selection field (only shown when creating and selecting existing user) */}
								{userMode === "select" && !isEditMode && (
									<FormField
										control={form.control}
										name="userId"
										render={({ field, fieldState }) => (
											<FormItem
												className={cn(
													fieldState.error &&
														"rounded-md border border-destructive/50 bg-destructive/5 p-2",
												)}
											>
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
														className={
															fieldState.error
																? "border-destructive focus-visible:ring-destructive"
																: ""
														}
														onSearch={async (query: string) => {
															if (query.length < 2) return [];
															const result = await searchUsersAction(
																String(params.storeId),
																{ query },
															);
															return result?.data?.users || [];
														}}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}
								{/* User property fields (only shown when editing) */}
								{isEditMode && (
									<>
										<FormField
											control={form.control}
											name="userName"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>
														{t("your_name") || "Your Name"}{" "}
														<span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															disabled={loading || form.formState.isSubmitting}
															placeholder={t("your_name") || "Enter your name"}
															value={field.value || ""}
															onChange={field.onChange}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="userEmail"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>{t("email") || "Email"}</FormLabel>
													<FormControl>
														<Input
															type="email"
															disabled={loading || form.formState.isSubmitting}
															placeholder="Enter email (optional)"
															value={field.value || ""}
															onChange={field.onChange}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="userPhone"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>{t("phone") || "Phone"}</FormLabel>
													<FormControl>
														<Input
															type="tel"
															disabled={loading || form.formState.isSubmitting}
															placeholder="Enter phone number (optional)"
															value={field.value || ""}
															onChange={field.onChange}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								)}
								{/* Create new user fields (only shown when creating and userMode is "create") */}
								{userMode === "create" && !isEditMode && (
									<>
										<FormField
											control={form.control}
											name="userName"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>
														{t("your_name") || "Your Name"}{" "}
														<span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															disabled={loading || form.formState.isSubmitting}
															placeholder={t("your_name") || "Enter your name"}
															value={field.value || ""}
															onChange={(e) => {
																const value = e.target.value;
																field.onChange(value);
																setUserCreationData({
																	...userCreationData,
																	name: value,
																});
																// Trigger validation for related fields
																if (userMode === "create") {
																	form.trigger(["userName", "userId"]);
																}
															}}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="userPassword"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>
														{t("password") || "Password"}{" "}
														<span className="text-destructive">*</span>
													</FormLabel>
													<FormControl>
														<Input
															type="password"
															disabled={loading || form.formState.isSubmitting}
															placeholder="Enter password"
															value={field.value || ""}
															onChange={(e) => {
																const value = e.target.value;
																field.onChange(value);
																setUserCreationData({
																	...userCreationData,
																	password: value,
																});
																// Trigger validation for related fields
																if (userMode === "create") {
																	form.trigger(["userPassword", "userId"]);
																}
															}}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="userEmail"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>{t("email") || "Email"}</FormLabel>
													<FormControl>
														<Input
															type="email"
															disabled={loading || form.formState.isSubmitting}
															placeholder="Enter email (optional)"
															value={field.value || ""}
															onChange={(e) => {
																field.onChange(e.target.value);
																setUserCreationData({
																	...userCreationData,
																	email: e.target.value,
																});
															}}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
										<FormField
											control={form.control}
											name="userPhone"
											render={({ field, fieldState }) => (
												<FormItem
													className={cn(
														fieldState.error &&
															"rounded-md border border-destructive/50 bg-destructive/5 p-2",
													)}
												>
													<FormLabel>{t("phone") || "Phone"}</FormLabel>
													<FormControl>
														<Input
															type="tel"
															disabled={loading || form.formState.isSubmitting}
															placeholder="Enter phone number (optional)"
															value={field.value || ""}
															onChange={(e) => {
																field.onChange(e.target.value);
																setUserCreationData({
																	...userCreationData,
																	phone: e.target.value,
																});
															}}
															className={cn(
																"h-10 text-base sm:h-9 sm:text-sm",
																fieldState.error &&
																	"border-destructive focus-visible:ring-destructive",
															)}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								)}
								<FormField
									control={form.control}
									name="memberRole"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("role") || "Role"}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<MemberRoleCombobox
													defaultValue={field.value || "staff"}
													onChange={(value) => field.onChange(value)}
													className={
														fieldState.error
															? "border-destructive focus-visible:ring-destructive"
															: ""
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="flex flex-row gap-2">
									<FormField
										control={form.control}
										name="capacity"
										render={({ field, fieldState }) => (
											<FormItem
												className={cn(
													fieldState.error &&
														"rounded-md border border-destructive/50 bg-destructive/5 p-2",
												)}
											>
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
														onChange={(event) =>
															field.onChange(event.target.value)
														}
														className={cn(
															"h-10 text-base sm:h-9 sm:text-sm",
															fieldState.error &&
																"border-destructive focus-visible:ring-destructive",
														)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="defaultDuration"
										render={({ field, fieldState }) => (
											<FormItem
												className={cn(
													fieldState.error &&
														"rounded-md border border-destructive/50 bg-destructive/5 p-2",
												)}
											>
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
														onChange={(event) =>
															field.onChange(event.target.value)
														}
														className={cn(
															"h-10 text-base sm:h-9 sm:text-sm",
															fieldState.error &&
																"border-destructive focus-visible:ring-destructive",
														)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
								<div className="flex flex-row gap-2">
									<FormField
										control={form.control}
										name="defaultCredit"
										render={({ field, fieldState }) => (
											<FormItem
												className={cn(
													fieldState.error &&
														"rounded-md border border-destructive/50 bg-destructive/5 p-2",
												)}
											>
												<FormLabel>
													{t("service_staff_default_credit") ||
														"Default Credit"}{" "}
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
														onChange={(event) =>
															field.onChange(event.target.value)
														}
														className={cn(
															"h-10 text-base sm:h-9 sm:text-sm",
															fieldState.error &&
																"border-destructive focus-visible:ring-destructive",
														)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="defaultCost"
										render={({ field, fieldState }) => (
											<FormItem
												className={cn(
													fieldState.error &&
														"rounded-md border border-destructive/50 bg-destructive/5 p-2",
												)}
											>
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
														onChange={(event) =>
															field.onChange(event.target.value)
														}
														className={cn(
															"h-10 text-base sm:h-9 sm:text-sm",
															fieldState.error &&
																"border-destructive focus-visible:ring-destructive",
														)}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={form.control}
									name="description"
									render={({ field, fieldState }) => (
										<FormItem
											className={cn(
												fieldState.error &&
													"rounded-md border border-destructive/50 bg-destructive/5 p-2",
											)}
										>
											<FormLabel>
												{t("service_staff_description") || "Description"}
											</FormLabel>
											<FormControl>
												<Textarea
													disabled={loading || form.formState.isSubmitting}
													className={cn(
														"font-mono min-h-[100px]",
														fieldState.error &&
															"border-destructive focus-visible:ring-destructive",
													)}
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
									name="receiveStoreNotifications"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
											<div className="space-y-0.5">
												<FormLabel className="text-base">
													{t("service_staff_receive_store_notifications") ||
														"Receive store notifications"}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t(
														"service_staff_receive_store_notifications_descr",
													) ||
														"When on, this staff member receives store notifications (e.g. new reservations, RSVP updates)."}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													checked={field.value}
													onCheckedChange={field.onChange}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
										</FormItem>
									)}
								/>

								{Object.keys(form.formState.errors).length > 0 && (
									<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
										<div className="text-sm font-semibold text-destructive">
											Please fix the following errors:
										</div>
										{Object.entries(form.formState.errors).map(
											([field, error]) => {
												// Map field names to user-friendly labels using i18n
												const fieldLabels: Record<string, string> = {
													userId: t("user") || "User",
													memberRole: t("role") || "Role",
													capacity: t("service_staff_capacity") || "Capacity",
													defaultCost:
														t("service_staff_default_cost") || "Default Cost",
													defaultCredit:
														t("service_staff_default_credit") ||
														"Default Credit",
													defaultDuration:
														t("service_staff_default_duration") ||
														"Default Duration (minutes)",
													description:
														t("service_staff_description") || "Description",
													receiveStoreNotifications:
														t("service_staff_receive_store_notifications") ||
														"Receive store notifications",
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
											},
										)}
									</div>
								)}

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
									<Tooltip>
										<TooltipTrigger asChild>
											<span className="inline-block">
												<Button
													type="submit"
													disabled={
														loading ||
														!form.formState.isValid ||
														form.formState.isSubmitting ||
														(!isEditMode &&
															userMode === "create" &&
															(!userCreationData.name ||
																!userCreationData.password))
													}
													className="w-full sm:w-auto h-10 sm:h-9"
												>
													<span className="text-sm sm:text-xs">
														{isEditMode ? t("save") : t("create")}
													</span>
												</Button>
											</span>
										</TooltipTrigger>
										{(loading ||
											!form.formState.isValid ||
											form.formState.isSubmitting ||
											(!isEditMode &&
												userMode === "create" &&
												(!userCreationData.name ||
													!userCreationData.password))) && (
											<TooltipContent className="max-w-xs">
												<div className="text-xs space-y-1">
													{loading || form.formState.isSubmitting ? (
														<div>{t("processing") || "Processing..."}</div>
													) : !isEditMode &&
														userMode === "create" &&
														(!userCreationData.name ||
															!userCreationData.password) ? (
														<div>
															{t("name_and_password_required") ||
																"Name and password are required to create a new user"}
														</div>
													) : !form.formState.isValid &&
														Object.keys(form.formState.errors).length > 0 ? (
														<div className="space-y-1">
															<div className="font-semibold">
																{t("please_fix_validation_errors") ||
																	"Please fix the following errors:"}
															</div>
															{Object.entries(form.formState.errors)
																.slice(0, 3)
																.map(([field, error]) => {
																	const fieldLabels: Record<string, string> = {
																		userId: t("user") || "User",
																		memberRole: t("role") || "Role",
																		capacity:
																			t("service_staff_capacity") || "Capacity",
																		defaultCost:
																			t("service_staff_default_cost") ||
																			"Default Cost",
																		defaultCredit:
																			t("service_staff_default_credit") ||
																			"Default Credit",
																		defaultDuration:
																			t("service_staff_default_duration") ||
																			"Default Duration",
																		description:
																			t("service_staff_description") ||
																			"Description",
																	};
																	const fieldLabel =
																		fieldLabels[field] || field;
																	return (
																		<div key={field} className="text-xs">
																			<span className="font-medium">
																				{fieldLabel}:
																			</span>{" "}
																			{error?.message as string}
																		</div>
																	);
																})}
															{Object.keys(form.formState.errors).length >
																3 && (
																<div className="text-xs opacity-75">
																	+
																	{Object.keys(form.formState.errors).length -
																		3}{" "}
																	more error(s)
																</div>
															)}
														</div>
													) : (
														<div>
															{t("please_fix_validation_errors") ||
																"Please fix validation errors above"}
														</div>
													)}
												</div>
											</TooltipContent>
										)}
									</Tooltip>
								</DialogFooter>
							</form>
						</Form>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

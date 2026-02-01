"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconKey } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { createUserAction } from "@/actions/sysAdmin/user/create-user";
import { updateUserAction } from "@/actions/sysAdmin/user/update-user";
import {
	type UpdateUserSettingsInput,
	updateUserSettingsSchema,
} from "@/actions/sysAdmin/user/user.validation";
import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { TimezoneSelect } from "@/components/timezone-select";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
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
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { authClient } from "@/lib/auth-client";
import type { User } from "@/types";
import { UserRoleCombobox } from "./user-role-combobox";
import { ResetPasswordDialog } from "./reset-password-dialog";
import logger from "@/lib/logger";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// type formValues = z.infer<typeof updateUserSettingsSchema>; // Using UpdateUserSettingsInput directly instead

interface props {
	item: User;
	onUpdated?: (newValue: User) => void;
	isNew?: boolean;
}

export const EditUser: React.FC<props> = ({ item, onUpdated, isNew }) => {
	const isMobile = useIsMobile();
	const [loading, setLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.language);
	const { t } = useTranslation(activeLng);

	async function onSubmit(data: UpdateUserSettingsInput) {
		setLoading(true);

		let result: { data?: User; serverError?: string } | null;
		if (isNew) {
			// create new user from client side
			const newUser = await authClient.admin.createUser({
				email: data.email || "",
				name: data.name,
				role: data.role as any, // Better Auth accepts any role string
				password: data.password as string,
			});

			data.id = newUser.data?.user.id || "";

			result = await createUserAction(data);
		} else {
			result = await updateUserAction(data);
		}

		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: "Profile updated." });
			handleChangeLanguage(data.locale);

			/*
			// set role
			const updatedUser = await authClient.admin.setRole({
				userId: data.id,
				role: data.role as string,
			});
			*/

			if (result.data) {
				onUpdated?.(result.data as User);
			}
		}
		setLoading(false);
		setIsOpen(false);
	}

	const handleChangeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		//cookies.set(cookieName, lng, { path: "/" });
		logger.info("activeLng set to: ");
	};

	// if timezone is not set, set it to America/New_York
	if (!item.timezone) {
		item.timezone = "America/New_York";
	}

	const defaultValues = item
		? {
				...item,
				banExpires: item.banExpires
					? new Date(item.banExpires).toISOString()
					: undefined,
			}
		: {};

	const form = useForm<UpdateUserSettingsInput>({
		resolver: zodResolver(updateUserSettingsSchema),
		defaultValues,
		mode: "onChange",
	});

	// Trigger validation on mount and when dialog opens to populate errors
	useEffect(() => {
		if (isOpen) {
			form.trigger(); // Validate all fields when dialog opens
		}
	}, [isOpen, form]);

	// Unused form instance - can be removed if not needed
	// const {
	// 	register,
	// 	formState: { errors },
	// 	handleSubmit,
	// 	clearErrors,
	// } = useForm<formValues>();

	//console.log('disabled', loading || form.formState.isSubmitting);

	return (
		<div className="flex items-center gap-1">
			<Dialog
				//direction={isMobile ? "bottom" : "right"}
				open={isOpen}
				onOpenChange={setIsOpen}
			>
				<DialogTrigger asChild>
					<Button
						variant={isNew ? "default" : "ghost"}
						size={isNew ? "default" : "icon"}
					>
						{isNew ? (
							<>
								<IconPlus className="mr-0 h-4 w-4" />
								{t("create")}
							</>
						) : (
							<IconPencil className="h-4 w-4" />
						)}
					</Button>
				</DialogTrigger>
				<DialogDescription> </DialogDescription>

				<DialogContent>
					<DialogHeader className="gap-1">
						<DialogTitle>{item.name}</DialogTitle>
						<DialogDescription>Edit User</DialogDescription>
					</DialogHeader>

					<div className="relative flex flex-col gap-4 overflow-y-auto px-4 text-sm">
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
								onSubmit={form.handleSubmit(onSubmit)}
								className="max-w-sm space-y-2.5"
							>
								{(!form.formState.isValid ||
									Object.keys(form.formState.errors).length > 0) && (
									<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
										<div className="text-sm font-semibold text-destructive">
											{Object.keys(form.formState.errors).length > 0
												? "Please fix the following errors:"
												: "Form is invalid. Please check all required fields."}
										</div>
										{Object.keys(form.formState.errors).length > 0 ? (
											Object.entries(form.formState.errors).map(
												([field, error]) => {
													// Map field names to user-friendly labels
													const fieldLabels: Record<string, string> = {
														id: "User ID",
														name: t("your_name"),
														email: t("email"),
														password: t("password"),
														locale: t("account_tabs_language"),
														timezone: t("timezone"),
														role: t("role"),
														phoneNumber: t("phone"),
														image: t("profile_image"),
														phoneNumberVerified: t("phone_number_verified"),
														twoFactorEnabled: "Two Factor Enabled",
														banned: t("banned"),
														banReason: t("ban_reason") || "Ban Reason",
														banExpires: t("ban_expires") || "Ban Expires",
													};
													const fieldLabel = fieldLabels[field] || field;
													return (
														<div
															key={field}
															className="text-sm text-destructive flex items-start gap-2"
														>
															<span className="font-medium">{fieldLabel}:</span>
															<span>{error?.message as string}</span>
														</div>
													);
												},
											)
										) : (
											<div className="text-sm text-destructive space-y-1">
												<div>
													The submit button is disabled because the form is
													invalid.
												</div>
												<div className="text-xs opacity-75 mt-1">
													Please fill in all required fields (marked with *) and
													ensure all values are valid.
												</div>
											</div>
										)}
									</div>
								)}
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("your_name")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder={t("your_name") || "Enter your name"}
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
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
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter email"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								{isNew && (
									<FormField
										control={form.control}
										name="password"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{t("password")}{" "}
													<span className="text-destructive">*</span>
												</FormLabel>
												<FormControl>
													<Input
														disabled={loading || form.formState.isSubmitting}
														placeholder="Enter password"
														{...field}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								)}

								<FormField
									control={form.control}
									name="locale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("account_tabs_language")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Select
													disabled={loading || form.formState.isSubmitting}
													onValueChange={field.onChange}
													defaultValue={field.value}
												>
													<SelectTrigger>
														<SelectValue placeholder="Select a default locale" />
													</SelectTrigger>
													<SelectContent>
														<LocaleSelectItems />
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="timezone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("timezone")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<TimezoneSelect
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
									name="role"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												<div>
													{t("role") || "Role"}{" "}
													<span className="text-destructive">*</span>
												</div>
											</FormLabel>
											<FormControl>
												<UserRoleCombobox
													defaultValue={field.value ?? ""}
													onChange={field.onChange}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="stripeCustomerId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>stripeCustomerId</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter stripeCustomerId"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="phoneNumber"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("phone") || "Phone"}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="+886912345678 or +14155551212"
													type="tel"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="phoneNumberVerified"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={Boolean(field.value)}
													onCheckedChange={(checked) =>
														field.onChange(checked === true)
													}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>
													{t("phone_number_verified") ||
														"Phone Number Verified"}
												</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="image"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("profile_image") || "Profile Image URL"}
											</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="https://example.com/image.jpg"
													type="url"
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="twoFactorEnabled"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={Boolean(field.value)}
													onCheckedChange={(checked) =>
														field.onChange(checked === true)
													}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>
													{t("two_factor_enabled") || "Two Factor Enabled"}
												</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="banned"
									render={({ field }) => (
										<FormItem className="flex flex-row items-start space-x-3 space-y-0">
											<FormControl>
												<Checkbox
													checked={Boolean(field.value)}
													onCheckedChange={(checked) =>
														field.onChange(checked === true)
													}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
											<div className="space-y-1 leading-none">
												<FormLabel>{t("banned") || "Banned"}</FormLabel>
											</div>
										</FormItem>
									)}
								/>

								{form.watch("banned") && (
									<>
										<FormField
											control={form.control}
											name="banReason"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("ban_reason") || "Ban Reason"}
													</FormLabel>
													<FormControl>
														<Textarea
															disabled={loading || form.formState.isSubmitting}
															placeholder="Enter ban reason"
															{...field}
															value={field.value ?? ""}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="banExpires"
											render={({ field }) => (
												<FormItem>
													<FormLabel>
														{t("ban_expires") || "Ban Expires"}
													</FormLabel>
													<FormControl>
														<Input
															disabled={loading || form.formState.isSubmitting}
															type="datetime-local"
															{...field}
															value={
																field.value
																	? new Date(field.value)
																			.toISOString()
																			.slice(0, 16)
																	: ""
															}
															onChange={(e) => {
																field.onChange(
																	e.target.value
																		? new Date(e.target.value).toISOString()
																		: "",
																);
															}}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								)}

								<div className="relative">
									<Button
										type="submit"
										disabled={
											loading ||
											!form.formState.isValid ||
											form.formState.isSubmitting
										}
										className="disabled:opacity-25"
										title={
											!form.formState.isValid
												? Object.keys(form.formState.errors).length > 0
													? `${Object.keys(form.formState.errors).length} validation error(s) - see error summary above`
													: "Form is invalid - please fill in all required fields"
												: undefined
										}
									>
										{t("submit")}
									</Button>
								</div>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>

			{!isNew && (
				<ResetPasswordDialog user={item}>
					<Button variant="ghost" size="icon" title="Set Password">
						<IconKey className="h-4 w-4" />
					</Button>
				</ResetPasswordDialog>
			)}
		</div>
	);
};

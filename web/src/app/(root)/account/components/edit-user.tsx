"use client";

import {
	UpdateUserSettingsInput,
	updateUserSettingsSchema,
} from "@/actions/user/update-user-settings.validation";
import { useTranslation } from "@/app/i18n/client";
import { cookieName } from "@/app/i18n/settings";
import SignOutButton from "@/components/auth/sign-out-button";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { TimezoneSelect } from "@/components/timezone-select";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import FormPhoneOtp from "@/components/auth/form-phone-otp";
import { authClient } from "@/lib/auth-client";
import { formatPhoneNumber } from "@/utils/phone-utils";
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCookies } from "next-client-cookies";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";

interface props {
	serverData: User | null | undefined;
}

// for user to edit it's own profile
//
export default function EditUser({ serverData }: props) {
	const [loading, setLoading] = useState(false);
	const [dbUser, setDbUser] = useState(serverData);
	const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
	const cookies = useCookies();
	const { t } = useTranslation(activeLng);

	const defaultValues = {
		...dbUser,
		//id: user.id,
		name: dbUser?.name ?? "",
		phone: (dbUser as any)?.phoneNumber ?? "",
		locale: dbUser?.locale || activeLng,
		timezone: dbUser?.timezone || "Asia/Taipei",
	};

	const form = useForm<UpdateUserSettingsInput>({
		resolver: zodResolver(updateUserSettingsSchema),
		defaultValues: defaultValues as UpdateUserSettingsInput,
		mode: "onChange",
	});

	// Refresh user data when phone dialog closes (after successful phone update)
	useEffect(() => {
		if (!phoneDialogOpen) {
			// Dialog closed, refresh user data
			const refreshUserData = async () => {
				const { data: session } = await authClient.getSession();
				if (session?.user) {
					setDbUser(session.user as User);
					// Update form field with new phone number
					form.setValue("phone", (session.user as any)?.phoneNumber ?? "");
				}
			};
			refreshUserData();
		}
	}, [phoneDialogOpen, form]);

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = form;

	async function onSubmit(data: UpdateUserSettingsInput) {
		setLoading(true);
		try {
			// Use authClient to update user name (Better Auth supports this)
			if (data.name && data.name !== dbUser?.name) {
				const updateResult = await authClient.updateUser({
					name: data.name,
				});

				if (updateResult.error) {
					toastError({
						description:
							updateResult.error.message ||
							t("account_tab_failed_to_update_profile") ||
							"Failed to update profile.",
					});
					setLoading(false);
					return;
				}
			}

			// For other fields (locale, timezone, phone), use API endpoint
			const hasOtherFieldsChanged =
				data.locale !== dbUser?.locale ||
				data.timezone !== dbUser?.timezone ||
				data.phone !== ((dbUser as any)?.phoneNumber ?? "");

			if (hasOtherFieldsChanged) {
				const response = await fetch("/api/user/update-settings", {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						locale: data.locale,
						timezone: data.timezone,
						phoneNumber: data.phone,
					}),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					toastError({
						description:
							errorData.error ||
							errorData.message ||
							t("account_tab_failed_to_update_profile") ||
							"Failed to update profile.",
					});
					setLoading(false);
					return;
				}

				const updatedUser = await response.json();
				setDbUser(updatedUser as User);
			} else {
				// Only name changed, refresh session to get updated user
				const { data: session } = await authClient.getSession();
				if (session?.user) {
					setDbUser(session.user as User);
				}
			}

			toastSuccess({
				description: t("account_tab_profile_updated") || "Profile updated.",
			});
			handleChangeLanguage(data.locale);
		} catch (error: any) {
			toastError({
				description:
					error.message ||
					t("account_tab_failed_to_update_profile_try_again") ||
					"Failed to update profile. Please try again.",
			});
		} finally {
			setLoading(false);
		}
	}

	const handleChangeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		cookies.set(cookieName, lng, { path: "/" });
		//console.log("activeLng set to: ", lng);
	};

	if (dbUser === null || dbUser === undefined) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("account_tabs_account")} </CardTitle>
				<CardDescription> </CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="flex items-center gap-1">
					{t("account_tab_current_acct")} {dbUser.email}
					{/* if user doesn't have email, show its userid */}
					{!dbUser.email && dbUser.id}
					<SignOutButton disabled={loading || form.formState.isSubmitting} />
				</div>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="max-w-sm space-y-2.5"
					>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("account_tab_name")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											disabled={loading || form.formState.isSubmitting}
											placeholder="Enter your name"
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
							name="phone"
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("account_tab_phone")}</FormLabel>
									<FormControl>
										<div className="flex gap-2">
											<Input
												readOnly
												disabled={loading || form.formState.isSubmitting}
												className="disabled:bg-gray-100 disabled:text-gray-500 flex-1"
												placeholder="No phone number"
												value={
													field.value
														? formatPhoneNumber(field.value) || field.value
														: ""
												}
											/>
											<Dialog
												open={phoneDialogOpen}
												onOpenChange={setPhoneDialogOpen}
											>
												<DialogTrigger asChild>
													<Button
														type="button"
														variant="outline"
														disabled={loading || form.formState.isSubmitting}
													>
														{t("account_tab_edit") || "Edit"}
													</Button>
												</DialogTrigger>
												<DialogContent className="max-w-lg">
													<DialogHeader>
														<DialogTitle>
															{t("account_tab_update_phone_number") ||
																"Update Phone Number"}
														</DialogTitle>
														<DialogDescription>
															{t(
																"account_tab_update_phone_number_description",
															) ||
																"Enter your new phone number and verify it with an OTP code."}
														</DialogDescription>
													</DialogHeader>
													<FormPhoneOtp
														callbackUrl="/account"
														editMode={true}
														onSuccess={() => {
															// Close dialog when phone update succeeds
															setPhoneDialogOpen(false);
															// Refresh user data
															const refreshUserData = async () => {
																const { data: session } =
																	await authClient.getSession();
																if (session?.user) {
																	setDbUser(session.user as User);
																	form.setValue(
																		"phone",
																		(session.user as any)?.phoneNumber ?? "",
																	);
																}
															};
															refreshUserData();
														}}
													/>
												</DialogContent>
											</Dialog>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
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
										{t("account_tab_timezone")}{" "}
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

						<Button
							type="submit"
							disabled={
								loading ||
								!form.formState.isValid ||
								form.formState.isSubmitting
							}
						>
							{t("account_tab_submit")}
						</Button>
					</form>
				</Form>

				{/* if subscriber, show the cards below
					<ChangeEmailCard />
					<DeleteAccountCard />
					*/}
			</CardContent>
			<CardFooter> </CardFooter>
		</Card>
	);
}

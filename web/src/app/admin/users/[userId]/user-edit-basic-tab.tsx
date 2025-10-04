"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { User } from "@/types";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

import { cookieName } from "@/app/i18n/settings";
import { useCookies } from "next-client-cookies";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { Button } from "@/components/ui/button";
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import type { z } from "zod";

import { updateUserSettingsAction } from "@/actions/admin/user/update-user-settings";
import {
	type UpdateUserSettingsInput,
	updateUserSettingsSchema,
} from "@/actions/admin/user/update-user-settings.validation";
import { toastError, toastSuccess } from "@/components/Toaster";
import { UserRoleCombobox } from "../components/user-role-combobox";

interface SettingsPageProps {
	user: User | null | undefined;
}
type formValues = z.infer<typeof updateUserSettingsSchema>;

export default function SettingsTab({ user }: SettingsPageProps) {
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
	const cookies = useCookies();
	const { t } = useTranslation(activeLng);

	const defaultValues = user
		? {
				...user,
			}
		: {};

	const form = useForm<UpdateUserSettingsInput>({
		resolver: zodResolver(updateUserSettingsSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<formValues>();

	//console.log('disabled', loading || form.formState.isSubmitting);

	if (user === null || user === undefined) return null;

	async function onSubmit(data: UpdateUserSettingsInput) {
		setLoading(true);
		const result = await updateUserSettingsAction(data);
		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: "Profile updated." });
			handleChangeLanguage(data.locale);
		}
		setLoading(false);
		router.push("../users");
	}

	const handleChangeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		cookies.set(cookieName, lng, { path: "/" });
		console.log("activeLng set to: ", lng);
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>{t("account_tabs_account")} </CardTitle>
					<CardDescription> </CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					{t("account_tab_currentAcct")} {user.email}
					{/* if user doesn't have email, show its userid */}
					{!user.email && user.id}
					&nbsp;&nbsp;
					<Button variant="secondary" onClick={() => signOut()}>
						{t("account_tab_signout")}
					</Button>
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
										<FormLabel>Name</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Enter your name"
												{...field}
											/>
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
										<FormLabel>{t("account_tabs_language")}</FormLabel>
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
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<FormControl>
											<UserRoleCombobox
												defaultValue={field.value}
												onChange={field.onChange}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<Button
								type="submit"
								disabled={loading || form.formState.isSubmitting}
								className="disabled:opacity-25"
							>
								{t("Submit")}
							</Button>
						</form>
					</Form>
				</CardContent>
				<CardFooter> </CardFooter>
			</Card>
		</>
	);
}

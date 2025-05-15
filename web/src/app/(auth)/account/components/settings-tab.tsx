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
import { signOut } from "next-auth/react";

import { cookieName, languages } from "@/app/i18n/settings";
import { useCookies } from "next-client-cookies";
import { useForm } from "react-hook-form";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";

import { zodResolver } from "@hookform/resolvers/zod";

import { LocaleSelectItems } from "@/components/locale-select-items";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { z } from "zod";

import {
	updateUserSettingsSchema,
	UpdateUserSettingsInput,
} from "@/actions/update-user-settings.validation";
import { updateUserSettingsAction } from "@/actions/update-user-settings";

interface SettingsPageProps {
	user: User | null | undefined;
}

export default function SettingsTab({ user }: SettingsPageProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
	const cookies = useCookies();
	const { t } = useTranslation(activeLng);

	const defaultValues = user
		? {
				name: user.name || "",
				locale: user.locale || "",
			}
		: { name: "", locale: "" };

	const form = useForm<UpdateUserSettingsInput>({
		resolver: zodResolver(updateUserSettingsSchema),
		defaultValues,
		mode: "onChange",
	});

	if (user === null || user === undefined) return null;

	async function onSubmit(data: UpdateUserSettingsInput) {
		setLoading(true);
		const result = await updateUserSettingsAction(data);
		if (result?.serverError) {
			toast({
				variant: "destructive",
				description: result.serverError,
			});
		} else {
			toast({ variant: "success", description: "Profile updated." });
			handleChangeLanguage(data.locale);
		}
		setLoading(false);
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
							<div className="space-y-1">
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
							</div>
							<Button
								type="submit"
								disabled={loading || form.formState.isSubmitting}
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

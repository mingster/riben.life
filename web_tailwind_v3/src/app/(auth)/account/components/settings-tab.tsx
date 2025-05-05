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
import { signOut, useSession } from "next-auth/react";

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
import axios from "axios";
import { useState } from "react";
import { z } from "zod";

export const userFormSchema = z.object({
	name: z.string().min(1, { message: "name is required" }),
	locale: z.string().min(1, { message: "locale is required" }),
});

export type userFormValues = z.infer<typeof userFormSchema>;

interface SettingsPageProps {
	user: User | null | undefined;
}

export default function SettingsTab({ user }: SettingsPageProps) {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);

	const { i18n } = useTranslation();
	const [activeLng, setActiveLng] = useState(i18n.resolvedLanguage);
	//const session = useSession();

	//console.log(`activeLng: ${activeLng}`);
	const { t } = useTranslation(activeLng);

	const defaultValues = user
		? {
				...user,
			}
		: {};

	const form = useForm<userFormValues>({
		resolver: zodResolver(userFormSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<userFormValues>();

	if (user === null || user === undefined) return;

	//console.log(`user: ${JSON.stringify(user)}`);

	async function onSubmit(data: userFormValues) {
		//try {

		setLoading(true);
		//console.log(`onSubmit: ${JSON.stringify(data)}`);
		await axios.patch(
			`${process.env.NEXT_PUBLIC_API_URL}/auth/account/update-settings`,
			data,
		);

		//await updateProfile(data);
		toast({ variant: "success", description: "Profile updated." });

		handleChangeLanguage(data.locale);

		//session.update();
		/*
    } catch (error) {
      toast({
        variant: "destructive",
        description: "An error occurred. Please try again.",
      });
    }*/

		setLoading(false);
	}

	const cookies = useCookies();

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
					{
						// if user doesn't have email, show its userid
						!user.email && user.id
					}
					&nbsp;&nbsp;
					<Button variant="link" onClick={() => signOut()}>
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

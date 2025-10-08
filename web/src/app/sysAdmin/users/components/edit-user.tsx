"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus, IconKey } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { createUserAction } from "@/actions/sysAdmin/user/create-user";
import { updateUserAction } from "@/actions/sysAdmin/user/update-user";
import {
	type UpdateUserSettingsInput,
	updateUserSettingsSchema,
} from "@/actions/sysAdmin/user/user.validation";
import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { toastError, toastSuccess } from "@/components/Toaster";
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

type formValues = z.infer<typeof updateUserSettingsSchema>;

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

		let result: User | null = null;
		if (isNew) {
			// create new user from client side
			const newUser = await authClient.admin.createUser({
				email: data.email || "",
				name: data.name,
				role: data.role as "user" | "admin" | ("user" | "admin")[],
				password: data.password as string,
			});

			data.id = newUser.data?.user.id || "";

			result = await createUserAction(data);
		} else {
			result = await updateUserAction(data);
		}

		if (result?.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: "Profile updated." });
			handleChangeLanguage(data.locale);

			/*
			// set role
			const updatedUser = await authClient.admin.setRole({
				userId: data.id,
				role: data.role as "user" | "admin" | ("user" | "admin")[],
			});
			*/

			onUpdated?.(result?.data as User);
		}
		setLoading(false);
		setIsOpen(false);
	}

	const handleChangeLanguage = (lng: string) => {
		i18n.changeLanguage(lng);
		setActiveLng(lng);
		//cookies.set(cookieName, lng, { path: "/" });
		console.log("activeLng set to: ", lng);
	};

	// if timezone is not set, set it to America/New_York
	if (!item.timezone) {
		item.timezone = "America/New_York";
	}

	const defaultValues = item
		? {
				...item,
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

				{Object.keys(form.formState.errors).length > 0 && (
					<div className="text-destructive space-y-2">
						{Object.entries(form.formState.errors).map(([field, error]) => (
							<div key={field} className="flex items-center gap-2">
								<span className="font-medium">{field}:</span>
								<span>{error.message as string}</span>
							</div>
						))}
					</div>
				)}

				<DialogContent>
					<DialogHeader className="gap-1">
						<DialogTitle>{item.name}</DialogTitle>
						<DialogDescription>Edit User</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
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
											<FormLabel>{t("name")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter name"
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
											<FormLabel>{t("email")}</FormLabel>
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
												<FormLabel>{t("password")}</FormLabel>
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
									name="timezone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("timezone")}</FormLabel>
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

"use client";

import { updateCustomerAction } from "@/actions/storeAdmin/customer/update-customer";
import {
	UpdateCustomerInput,
	updateCustomerSchema,
} from "@/actions/storeAdmin/customer/update-customer.validation";
import { useTranslation } from "@/app/i18n/client";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { TimezoneSelect } from "@/components/timezone-select";
import { toastError, toastSuccess } from "@/components/toaster";
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
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod/v4";
import { UserRoleCombobox } from "./user-role-combobox";

//type formValues = z.infer<typeof updateCustomerSchema>;

interface EditCustomerProps {
	item: User;
	onUpdated?: (newValue: User) => void;
	isNew?: boolean;
}

// edit customer in this store
// admin can add/review/edit customers in this store
//
export const EditCustomer: React.FC<EditCustomerProps> = ({
	item,
	onUpdated,
	isNew,
}) => {
	const [loading, setLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	async function onSubmit(data: UpdateCustomerInput) {
		setLoading(true);

		let result;
		if (isNew) {
			// create a new user and add to this store from client side
			const newUser = await authClient.admin.createUser({
				email: data.email || "",
				name: data.name,
				role: data.role as any, // Better Auth accepts any role string
				password: data.password as string,
			});

			data.customerId = newUser.data?.user.id || "";

			result = await updateCustomerAction(data);
		} else {
			result = await updateCustomerAction(data);
		}

		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: "Profile updated." });

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

	// if timezone is not set, set it to America/New_York
	if (!item.timezone) {
		item.timezone = "Asia/Taipei";
	}

	const defaultValues = item
		? {
				...item,
			}
		: {};

	const form = useForm<UpdateCustomerInput>({
		resolver: zodResolver(updateCustomerSchema),
		defaultValues,
		mode: "onChange",
	});

	const {
		register,
		formState: { errors },
		handleSubmit,
		clearErrors,
	} = useForm<UpdateCustomerInput>();

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
		</div>
	);
};

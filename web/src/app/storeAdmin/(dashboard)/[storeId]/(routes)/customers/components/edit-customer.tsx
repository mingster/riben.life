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
import { useParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
	const params = useParams<{ storeId: string }>();
	const [loading, setLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	async function onSubmit(data: UpdateCustomerInput) {
		setLoading(true);

		let result: { data?: User; serverError?: string } | null;
		if (isNew) {
			// create a new user and add to this store from client side
			// Generate email if not provided (similar to import logic)
			let finalEmail = data.email?.trim() || "";
			if (!finalEmail) {
				const phoneNumber = data.phone?.trim() || "";
				if (phoneNumber) {
					// Mock email from phoneNumber if phoneNumber provided
					finalEmail = `${phoneNumber.replace(/[^0-9]/g, "")}@phone.riben.life`;
				} else {
					// Generate unique email from name + timestamp + random
					const sanitizedName = (data.name || "")
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
				name: data.name,
				//role: data.role as any, // Better Auth accepts any role string
				password: data.password as string,
			});

			const submitData: UpdateCustomerInput = {
				...data,
				customerId: newUser.data?.user.id || "",
				storeId: String(params.storeId),
			};

			result = await updateCustomerAction(String(params.storeId), submitData);
		} else {
			const submitData: UpdateCustomerInput = {
				...data,
				customerId: item.id,
				storeId: String(params.storeId),
			};

			result = await updateCustomerAction(String(params.storeId), submitData);
		}

		if (!result) {
			toastError({ description: "An error occurred" });
		} else if (result.serverError) {
			toastError({ description: result.serverError });
		} else {
			toastSuccess({ description: t("member_data") + t("updated") });

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

	const defaultValues: UpdateCustomerInput = {
		customerId: item.id,
		storeId: String(params.storeId),
		email: item.email || "",
		name: item.name || "",
		phone: (item as any).phoneNumber ?? "",
		locale: item.locale || lng,
		timezone: item.timezone || "Asia/Taipei",
		password: undefined,
	};

	const form = useForm<UpdateCustomerInput>({
		resolver: zodResolver(updateCustomerSchema),
		defaultValues,
		mode: "onChange",
	});

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
						<DialogDescription>
							{isNew ? t("create") : t("edit")} {t("member_data")}
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit)}
								className="max-w-sm space-y-2.5"
							>
								{/* Hidden fields for customerId and storeId */}
								<FormField
									control={form.control}
									name="customerId"
									render={({ field }) => <input type="hidden" {...field} />}
								/>
								<FormField
									control={form.control}
									name="storeId"
									render={({ field }) => <input type="hidden" {...field} />}
								/>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("name")} <span className="text-destructive">*</span>
											</FormLabel>
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
											<FormLabel>{t("phone")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Enter phone number"
													{...field}
													value={field.value ?? ""}
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

								{Object.keys(form.formState.errors).length > 0 && (
									<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
										<div className="text-sm font-semibold text-destructive">
											Please fix the following errors:
										</div>
										{Object.entries(form.formState.errors).map(
											([field, error]) => {
												// Map field names to user-friendly labels
												const fieldLabels: Record<string, string> = {
													name: t("name"),
													email: t("email"),
													password: t("password"),
													locale: t("account_tabs_language"),
													timezone: t("timezone"),
													phone: t("phone"),
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

								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{t("submit")}
								</Button>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

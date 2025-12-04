"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Store } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StoreSettings } from "@prisma/client";

import { type AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import * as z from "zod";

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

import { ApiListing } from "@/components/api-listing";
import { CountryCombobox } from "@/components/country-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { LocaleSelectItems } from "@/components/locale-select-items";

import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useOrigin from "@/hooks/use-origin";
import { useI18n } from "@/providers/i18n-provider";
import { updateStoreBasicAction } from "@/actions/storeAdmin/settings/update-store-basic";
import type { UpdateStoreBasicInput } from "@/actions/storeAdmin/settings/update-store-basic.validation";
import { TimezoneSelect } from "@/components/timezone-select";

const formSchema = z.object({
	name: z.string().min(1, { message: "store name is required" }),
	defaultLocale: z.string().min(1),
	defaultCountry: z.string().min(1),
	defaultCurrency: z.string().min(1),
	defaultTimezone: z.string().optional().default("Asia/Taipei"),
	businessHours: z.string().min(1),
	orderNoteToCustomer: z.string().optional(),

	requireSeating: z.boolean().optional().default(false), //需要帶位or not
	requirePrepaid: z.boolean().optional().default(true), //先付款再出貨

	useBusinessHours: z.boolean().optional().default(true),
	autoAcceptOrder: z.boolean().optional().default(false),
	isOpen: z.boolean().optional().default(false),
});

type formValues = z.infer<typeof formSchema>;

export interface SettingsFormProps {
	store: Store;
	storeSettings: StoreSettings | null;
	onStoreUpdated?: (store: Store) => void;
	onStoreSettingsUpdated?: (settings: StoreSettings | null) => void;
	/*
  initialData:
	| (Store & {
		name: string;
	  })
	| null;
  logo: string;

  */
}

export const BasicSettingTab: React.FC<SettingsFormProps> = ({
	store,
	storeSettings,
	onStoreUpdated,
	onStoreSettingsUpdated,
}) => {
	const params = useParams();
	const router = useRouter();

	const origin = useOrigin();
	const [loading, setLoading] = useState(false);
	const [checkingSlug, setCheckingSlug] = useState(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
	//const [openAddNew, setOpenAddNew] = useState(false);

	const defaultValues = store
		? {
				...store,
				orderNoteToCustomer: storeSettings?.orderNoteToCustomer || "",
				businessHours: storeSettings?.businessHours || "",
			}
		: { orderNoteToCustomer: "", businessHours: "" };

	// Replace null values with empty strings for string fields
	const sanitizedDefaultValues = Object.fromEntries(
		Object.entries(defaultValues).map(([key, value]) => [
			key,
			value === null ? "" : value,
		]),
	);

	//console.log('defaultValues: ' + JSON.stringify(defaultValues));
	const form = useForm<formValues>({
		resolver: zodResolver(formSchema) as any,
		defaultValues: sanitizedDefaultValues,
	});

	/*
  const [isSubmittable, setIsSubmittable] = useState(
	!!form.formState.isDirty && !!form.formState.isValid,
  );
  useEffect(() => {
	setIsSubmittable(!!form.formState.isDirty && !!form.formState.isValid);
  }, [form.formState]);
  logger.info("Operation log");

  const useBusinessHours = form.watch("useBusinessHours");
  logger.info("Operation log");
  //form.setValue("isOpen", !useBusinessHours);
  */

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const storeName = form.watch("name");
	const originalStoreName = store?.name || "";

	// Debounced validation to check if store name (slug) is taken
	// Only check if the name has changed from the original
	useEffect(() => {
		// Clear previous timer
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		// Don't check if name is empty or too short
		if (!storeName || storeName.trim().length < 1) {
			form.clearErrors("name");
			return;
		}

		// Don't check if name hasn't changed from original (edit mode)
		if (storeName.trim() === originalStoreName.trim()) {
			form.clearErrors("name");
			return;
		}

		// Generate slug from store name
		const slug = storeName.toLowerCase().replace(/ /g, "-");

		// Debounce the check (wait 500ms after user stops typing)
		debounceTimerRef.current = setTimeout(async () => {
			setCheckingSlug(true);
			try {
				const response = await fetch(
					`/api/common/check-organization-slug?slug=${encodeURIComponent(slug)}`,
				);

				if (!response.ok) {
					// Server/network error - don't block form, server will validate
					form.clearErrors("name");
					return;
				}

				const data = await response.json();

				// Handle response:
				// - API returns { status: true } if slug exists (is taken)
				// - API returns { status: false } if slug is available
				if (data.status === true) {
					// Slug exists (is taken)
					form.setError("name", {
						type: "manual",
						message:
							t("Store_Name_Taken") ||
							"Store name is already taken. Please choose a different name.",
					});
				} else {
					// Slug is available
					form.clearErrors("name");
				}
			} catch (error) {
				// If check fails, don't block form submission
				// The server will validate on submit
				form.clearErrors("name");
			} finally {
				setCheckingSlug(false);
			}
		}, 500); // 500ms debounce

		// Cleanup timer on unmount or when name changes
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [storeName, originalStoreName, form, t]);

	//console.log(`form error: ${JSON.stringify(form.formState.errors)}`);

	const onSubmit = async (data: formValues) => {
		try {
			setLoading(true);

			const payload: Omit<UpdateStoreBasicInput, "storeId"> = {
				name: data.name,
				orderNoteToCustomer: data.orderNoteToCustomer ?? "",
				defaultLocale: data.defaultLocale,
				defaultCountry: data.defaultCountry,
				defaultCurrency: data.defaultCurrency,
				defaultTimezone:
					data.defaultTimezone ?? store.defaultTimezone ?? "Asia/Taipei",
				autoAcceptOrder: data.autoAcceptOrder ?? false,
				isOpen: data.isOpen ?? false,
				acceptAnonymousOrder: store.acceptAnonymousOrder,
				useBusinessHours: data.useBusinessHours ?? true,
				businessHours: data.businessHours ?? "",
				requireSeating: data.requireSeating ?? false,
				requirePrepaid: data.requirePrepaid ?? true,
			};

			const result = await updateStoreBasicAction(
				params.storeId as string,
				payload,
			);

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
			} else if (result?.data) {
				const { store: updatedStore, storeSettings: updatedSettings } =
					result.data;
				onStoreUpdated?.(updatedStore as Store);
				onStoreSettingsUpdated?.(
					(updatedSettings as StoreSettings | null | undefined) ?? null,
				);

				toastSuccess({
					title: t("store_updated"),
					description: "",
				});
			}
		} catch (error: unknown) {
			const err = error as AxiosError;
			toastError({
				title: "Something went wrong.",
				description: err.message,
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<Card>
				<CardContent className="">
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="w-full space-y-1"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("StoreSettings_Store_Name")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("StoreSettings_Store_Name_descr")}
												{...field}
												onChange={(e) => {
													field.onChange(e);
													// Clear error when user starts typing
													if (form.formState.errors.name) {
														form.clearErrors("name");
													}
												}}
											/>
										</FormControl>
										{checkingSlug && (
											<p className="text-sm text-muted-foreground">
												{t("Checking_Availability") ||
													"Checking availability..."}
											</p>
										)}
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-flow-row-dense grid-cols-1 gap-1">
								<FormField
									control={form.control}
									name="orderNoteToCustomer"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_orderNoteToCustomer")}
											</FormLabel>
											<FormControl>
												<Textarea
													disabled={loading || form.formState.isSubmitting}
													className="font-mono min-h-20"
													placeholder=""
													{...field}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("StoreSettings_orderNoteToCustomer_desccr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="defaultLocale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_Store_Locale")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<SelectTrigger className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
													<SelectValue
														placeholder={t("StoreSettings_Store_Locale_descr")}
													/>
												</SelectTrigger>

												<SelectContent className="bg-primary-foreground dark:bg-primary">
													<LocaleSelectItems />
												</SelectContent>
											</Select>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultCurrency"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_Store_Currency")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<CurrencyCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value ?? "twd"}
											/>
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="defaultCountry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("StoreSettings_Store_Country")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<CountryCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											/>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultTimezone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Timezone")}</FormLabel>
											<FormControl>
												<TimezoneSelect
													value={field.value ?? "Asia/Taipei"}
													onValueChange={field.onChange}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("StoreSettings_Store_Timezone_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="isOpen"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>{t("StoreSettings_isOpen")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_isOpen_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													ref={field.ref}
													disabled={loading || form.watch("useBusinessHours")}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="useBusinessHours"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>
													{t("StoreSettings_useBusinessHours")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_useBusinessHours_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													ref={field.ref}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-1 gap-1">
								<FormField
									control={form.control}
									name="businessHours"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("business_hours")}</FormLabel>
											<FormControl>
												<Textarea
													disabled={loading || form.formState.isSubmitting}
													className="font-mono min-h-100"
													placeholder=""
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="requireSeating"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>
													{t("StoreSettings_requireSeating")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_requireSeating_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="requirePrepaid"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>
													{t("StoreSettings_requirePrepay")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_requirePrepay_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="autoAcceptOrder"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>
													{t("StoreSettings_autoAcceptOrder")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("StoreSettings_autoAcceptOrder_descr")}
												</FormDescription>
											</div>
											<FormControl>
												<Switch
													disabled={loading || form.formState.isSubmitting}
													checked={field.value}
													onCheckedChange={field.onChange}
												/>
											</FormControl>
										</FormItem>
									)}
								/>
							</div>

							<Button
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
								type="submit"
							>
								{t("save")}
							</Button>

							<Button
								type="button"
								variant="outline"
								onClick={() => {
									router.push("../");
								}}
								disabled={loading || form.formState.isSubmitting}
								className="ml-2 disabled:opacity-25"
							>
								{t("cancel")}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
			<ApiListing
				title="API"
				variant="public"
				description={`${origin}/api/${params.storeId}`}
			/>
		</>
	);
};

/*
const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
type TimeValue =
  | "00:00:00"
  | "00:30:00"
  | "01:00:00"
  | "01:30:00"
  | "02:00:00"
  | "02:30:00"
  | "03:00:00"
  | "03:30:00"
  | "04:00:00"
  | "04:30:00"
  | "05:00:00"
  | "05:30:00"
  | "06:00:00"
  | "06:30:00"
  | "07:00:00"
  | "07:30:00"
  | "08:00:00"
  | "08:30:00"
  | "09:00:00"
  | "09:30:00"
  | "10:00:00"
  | "10:30:00"
  | "11:00:00"
  | "11:30:00"
  | "12:00:00"
  | "12:30:00"
  | "13:00:00"
  | "13:30:00"
  | "14:00:00"
  | "14:30:00"
  | "15:00:00"
  | "15:30:00"
  | "16:00:00"
  | "16:30:00"
  | "17:00:00"
  | "17:30:00"
  | "18:00:00"
  | "18:30:00"
  | "19:00:00"
  | "19:30:00"
  | "20:00:00"
  | "20:30:00"
  | "21:00:00"
  | "21:30:00"
  | "22:00:00"
  | "22:30:00"
  | "23:00:00"
  | "23:30:00"
  | "closed";
*/

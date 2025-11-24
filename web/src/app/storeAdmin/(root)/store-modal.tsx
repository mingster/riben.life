"use client";

import { toastError, toastSuccess } from "@/components/toaster";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/providers/i18n-provider";

import { CountryCombobox } from "@/components/country-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { Button } from "@/components/ui/button";
import { useStoreModal } from "@/hooks/storeAdmin/use-store-modal";
import { createStoreAction } from "@/actions/storeAdmin/store/create-store";
import {
	createStoreSchema,
	type CreateStoreInput,
} from "@/actions/storeAdmin/store/create-store.validation";
import clientLogger from "@/lib/client-logger";

export const StoreModal: React.FC = () => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const storeModal = useStoreModal();
	const [loading, setLoading] = useState(false);
	const [checkingSlug, setCheckingSlug] = useState(false);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const form = useForm<CreateStoreInput>({
		resolver: zodResolver(createStoreSchema),
		defaultValues: {
			name: "",
			defaultCountry: "TWN",
			defaultCurrency: "TWD",
			defaultLocale: "tw",
		},
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const storeName = form.watch("name");

	// Debounced validation to check if store name (slug) is taken
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
					clientLogger.warn("Error checking slug availability", {
						metadata: {
							status: response.status,
							statusText: response.statusText,
							slug,
						},
						tags: ["store", "validation", "warning"],
					});
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
				clientLogger.error("Error checking store name availability", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
						slug,
					},
					tags: ["store", "validation", "error"],
				});
				// Don't set error - let server validate
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
	}, [storeName, form, t]);

	const onSubmit = async (values: CreateStoreInput) => {
		try {
			setLoading(true);

			const result = await createStoreAction(values);

			if (result?.serverError) {
				toastError({
					title: t("Error"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data?.storeId) {
				toastSuccess({
					title: t("Store_created"),
					description: "",
				});

				// Close modal
				storeModal.onClose();

				// Navigate to store settings
				router.push(`/storeAdmin/${result.data.storeId}/settings`);
			}
		} catch (error: unknown) {
			toastError({
				title: t("Error"),
				description:
					error instanceof Error ? error.message : "Something went wrong.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			title={t("Store_create")}
			description=""
			isOpen={storeModal.isOpen}
			onClose={storeModal.onClose}
		>
			<div>
				<div className="space-y-4 py-2 pb-4">
					<div className="space-y-2">
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(onSubmit, (errors) => {
									const firstErrorKey = Object.keys(errors)[0];
									if (firstErrorKey) {
										const error = errors[firstErrorKey as keyof typeof errors];
										const errorMessage = error?.message;
										if (errorMessage) {
											toastError({
												title: t("Error"),
												description: errorMessage,
											});
										}
									}
								})}
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Name")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
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

								<FormField
									control={form.control}
									name="defaultLocale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Locale")}</FormLabel>
											<Select
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<SelectTrigger>
													<SelectValue
														placeholder={t("StoreSettings_Store_Locale_descr")}
													/>
												</SelectTrigger>

												<SelectContent>
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
											<FormLabel>{t("StoreSettings_Store_Currency")}</FormLabel>
											<CurrencyCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											/>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultCountry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("StoreSettings_Store_Country")}</FormLabel>
											<CountryCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											/>
										</FormItem>
									)}
								/>

								<div className="flex w-full items-center justify-end space-x-2 pt-6">
									<Button
										disabled={
											loading ||
											!form.formState.isValid ||
											form.formState.isSubmitting
										}
										variant="outline"
										onClick={storeModal.onClose}
									>
										{t("cancel")}
									</Button>
									<Button
										disabled={loading || form.formState.isSubmitting}
										type="submit"
									>
										{t("continue")}
									</Button>
								</div>
							</form>
						</Form>
					</div>
				</div>
			</div>
		</Modal>
	);
};

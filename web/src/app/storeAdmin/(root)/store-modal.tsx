"use client";

import { Loader } from "@/components/loader";
import { toastError, toastSuccess } from "@/components/toaster";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useRouter, usePathname } from "next/navigation";
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
	SelectItem,
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
	const pathname = usePathname();
	const storeModal = useStoreModal();
	const isModalOpen = useStoreModal((state) => state.isOpen);
	const onCloseModal = useStoreModal((state) => state.onClose);
	const [loading, setLoading] = useState(false);
	const [checkingSlug, setCheckingSlug] = useState(false);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const form = useForm<CreateStoreInput>({
		resolver: zodResolver(createStoreSchema),
		defaultValues: {
			name: "",
			defaultCountry: "TW",
			defaultCurrency: "twd",
			defaultLocale: "tw",
		},
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const storeName = form.watch("name");

	useEffect(() => {
		if (
			pathname &&
			pathname.startsWith("/storeAdmin/") &&
			pathname !== "/storeAdmin" &&
			isModalOpen
		) {
			onCloseModal();
		}
	}, [pathname, isModalOpen, onCloseModal]);

	const handleCancel = () => {
		storeModal.onClose();
		router.push("/");
	};

	useEffect(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		if (!storeName || storeName.trim().length < 1) {
			form.clearErrors("name");
			return;
		}

		const slug = storeName.toLowerCase().replace(/ /g, "-");

		debounceTimerRef.current = setTimeout(async () => {
			setCheckingSlug(true);
			try {
				const response = await fetch(
					`/api/common/check-organization-slug?slug=${encodeURIComponent(slug)}`,
				);

				if (!response.ok) {
					form.clearErrors("name");
					return;
				}

				const data = (await response.json()) as { status?: boolean };

				if (data.status === true) {
					form.setError("name", {
						type: "manual",
						message:
							t("store_name_taken") ||
							"Store name is already taken. Please choose a different name.",
					});
				} else {
					form.clearErrors("name");
				}
			} catch (error) {
				clientLogger.error("Error checking store name availability", {
					metadata: {
						error: error instanceof Error ? error.message : String(error),
						slug,
					},
					tags: ["store", "validation", "error"],
				});
				form.clearErrors("name");
			} finally {
				setCheckingSlug(false);
			}
		}, 500);

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
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data && "storeId" in result.data && result.data.storeId) {
				toastSuccess({
					title: t("store_created") || "Store created",
					description: "",
				});

				form.reset();
				storeModal.onClose();
				router.push(`/storeAdmin/${result.data.storeId}/settings`);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description:
					error instanceof Error ? error.message : "Something went wrong.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			title={t("store_create") || "Create store"}
			description=""
			isOpen={storeModal.isOpen}
			onClose={storeModal.onClose}
		>
			<div>
				<div className="relative space-y-4 py-2 pb-4">
					{(loading || form.formState.isSubmitting) && (
						<div
							className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
							aria-hidden="true"
						>
							<div className="flex flex-col items-center gap-3">
								<Loader />
								<span className="text-sm font-medium text-muted-foreground">
									{t("submitting") || "Submitting..."}
								</span>
							</div>
						</div>
					)}
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
												title: t("error_title"),
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
											<FormLabel>{t("store_settings_store_name")}</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder={t("store_settings_store_name_descr")}
													{...field}
													onChange={(e) => {
														field.onChange(e);
														if (form.formState.errors.name) {
															form.clearErrors("name");
														}
													}}
												/>
											</FormControl>
											{checkingSlug && (
												<p className="text-sm text-muted-foreground">
													{t("checking_availability") ||
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
											<FormLabel>{t("store_settings_store_locale")}</FormLabel>
											<Select
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												value={field.value ?? ""}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue
															placeholder={t(
																"store_settings_store_locale_descr",
															)}
														/>
													</SelectTrigger>
												</FormControl>
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
											<FormLabel>
												{t("store_settings_store_currency")}
											</FormLabel>
											<CurrencyCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value ?? ""}
											/>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="defaultCountry"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{t("store_settings_store_country")}</FormLabel>
											<CountryCombobox
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value ?? ""}
											/>
										</FormItem>
									)}
								/>

								<div className="flex w-full items-center justify-end space-x-2 pt-6">
									<Button
										disabled={loading || form.formState.isSubmitting}
										variant="outline"
										onClick={handleCancel}
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

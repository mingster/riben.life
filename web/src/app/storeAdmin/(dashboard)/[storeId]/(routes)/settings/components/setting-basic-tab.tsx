"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { StoreSettings } from "@prisma/client";
import {
	IconChevronDown,
	IconPhoto,
	IconTrash,
	IconUpload,
	IconVideo,
} from "@tabler/icons-react";
import type { AxiosError } from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { updateStoreBasicAction } from "@/actions/storeAdmin/settings/update-store-basic";
import {
	type UpdateStoreBasicInput,
	updateStoreBasicSchema,
} from "@/actions/storeAdmin/settings/update-store-basic.validation";
import { useTranslation } from "@/app/i18n/client";
import { AdminSettingsTabFormFooter } from "@/components/admin-settings-tabs";
import { ApiListing } from "@/components/api-listing";
import { CountryCombobox } from "@/components/country-combobox";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { Loader } from "@/components/loader";
import { LocaleSelectItems } from "@/components/locale-select-items";
import { TimezoneSelect } from "@/components/timezone-select";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import useOrigin from "@/hooks/use-origin";
import { BusinessHoursEditor } from "@/lib/businessHours";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import { fileToBase64Payload } from "@/utils/image-utils";
import type { Store } from "@/types";
import type { BasicTabProps } from "./settings-types";

type FormValues = UpdateStoreBasicInput;

function LogoUploadField({
	storeId,
	initialUrl,
	initialKey,
	disabled,
	onLogoChanged,
}: {
	storeId: string;
	initialUrl: string;
	initialKey: string;
	disabled: boolean;
	onLogoChanged: (url: string, key: string) => void;
}) {
	const [logoUrl, setLogoUrl] = useState(initialUrl.trim());
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setLogoUrl(initialUrl.trim());
	}, [initialUrl]);

	async function handleFile(file: File) {
		setUploading(true);
		try {
			// JSON + base64: matches product-image-gallery — some dev stacks coerce POST
			// Content-Type to application/json, which breaks multipart/octet-stream uploads.
			const base64 = await fileToBase64Payload(file);
			const res = await fetch(`/api/storeAdmin/${storeId}/settings/logo`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					base64,
					mimeType: file.type && file.type.trim() !== "" ? file.type : null,
				}),
				credentials: "same-origin",
			});
			if (!res.ok) {
				const msg = await res.text();
				throw new Error(msg || "Upload failed");
			}
			const data = (await res.json()) as { url: string; key: string };
			setLogoUrl(data.url);
			onLogoChanged(data.url, data.key);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			toastError({ description: msg });
		} finally {
			setUploading(false);
		}
	}

	async function handleRemove() {
		setUploading(true);
		try {
			await fetch(`/api/storeAdmin/${storeId}/settings/logo`, {
				method: "DELETE",
			});
			setLogoUrl("");
			onLogoChanged("", "");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="flex items-center gap-4">
			<div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
				{logoUrl ? (
					// Native <img>: store logos may be MinIO (http), CloudFront, or other hosts
					// not listed in next.config `images.remotePatterns`; next/image would block them.
					<img
						src={logoUrl}
						alt="Store logo"
						className="h-full w-full object-cover"
						loading="lazy"
						decoding="async"
					/>
				) : (
					<IconPhoto className="h-8 w-8 text-muted-foreground" />
				)}
			</div>
			<div className="flex flex-col gap-2">
				<input
					ref={inputRef}
					type="file"
					accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) handleFile(f);
						e.target.value = "";
					}}
					disabled={disabled || uploading}
				/>
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={disabled || uploading}
					className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 touch-manipulation"
				>
					<IconUpload className="h-4 w-4" />
					{uploading ? "Uploading…" : "Upload"}
				</button>
				{logoUrl && (
					<button
						type="button"
						onClick={handleRemove}
						disabled={disabled || uploading}
						className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 touch-manipulation"
					>
						<IconTrash className="h-4 w-4" />
						Remove
					</button>
				)}
			</div>
		</div>
	);
}

function StoreHomeVideoUploadField({
	storeId,
	initialUrl,
	disabled,
	onVideoChanged,
}: {
	storeId: string;
	initialUrl: string;
	disabled: boolean;
	onVideoChanged: (url: string, key: string) => void;
}) {
	const [videoUrl, setVideoUrl] = useState(initialUrl.trim());
	const [uploading, setUploading] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setVideoUrl(initialUrl.trim());
	}, [initialUrl]);

	async function handleFile(file: File) {
		setUploading(true);
		try {
			const base64 = await fileToBase64Payload(file);
			const res = await fetch(
				`/api/storeAdmin/${storeId}/settings/store-home-video`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						base64,
						mimeType: file.type && file.type.trim() !== "" ? file.type : null,
					}),
					credentials: "same-origin",
				},
			);
			if (!res.ok) {
				const msg = await res.text();
				throw new Error(msg || "Upload failed");
			}
			const data = (await res.json()) as { url: string; key: string };
			setVideoUrl(data.url);
			onVideoChanged(data.url, data.key);
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			toastError({ description: msg });
		} finally {
			setUploading(false);
		}
	}

	async function handleRemove() {
		setUploading(true);
		try {
			await fetch(`/api/storeAdmin/${storeId}/settings/store-home-video`, {
				method: "DELETE",
			});
			setVideoUrl("");
			onVideoChanged("", "");
		} finally {
			setUploading(false);
		}
	}

	return (
		<div className="flex items-start gap-4">
			<div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
				{videoUrl ? (
					<video
						src={videoUrl}
						className="h-full w-full object-cover"
						muted
						playsInline
						loop
						autoPlay
					/>
				) : (
					<IconVideo className="h-8 w-8 text-muted-foreground" />
				)}
			</div>
			<div className="flex flex-col gap-2">
				<input
					ref={inputRef}
					type="file"
					accept="video/mp4,video/webm,video/quicktime"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (f) handleFile(f);
						e.target.value = "";
					}}
					disabled={disabled || uploading}
				/>
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={disabled || uploading}
					className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50 touch-manipulation"
				>
					<IconUpload className="h-4 w-4" />
					{uploading ? "Uploading..." : "Upload"}
				</button>
				{videoUrl && (
					<button
						type="button"
						onClick={handleRemove}
						disabled={disabled || uploading}
						className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 touch-manipulation"
					>
						<IconTrash className="h-4 w-4" />
						Remove
					</button>
				)}
			</div>
		</div>
	);
}

export const BasicSettingTab: React.FC<BasicTabProps> = ({
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
	const [businessHoursExpanded, setBusinessHoursExpanded] = useState(() =>
		Boolean(store?.useBusinessHours ?? true),
	);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	//const [openAddNew, setOpenAddNew] = useState(false);

	const defaultValues: FormValues = store
		? {
				name: store.name,
				description: storeSettings?.description ?? "",
				defaultLocale: store.defaultLocale,
				defaultCountry: store.defaultCountry,
				defaultCurrency: store.defaultCurrency,
				defaultTimezone: store.defaultTimezone ?? "Asia/Taipei",
				autoAcceptOrder: store.autoAcceptOrder ?? false,
				isOpen: store.isOpen ?? false,
				acceptAnonymousOrder: store.acceptAnonymousOrder ?? true,
				useBusinessHours: store.useBusinessHours ?? true,
				businessHours: storeSettings?.businessHours ?? "",
				requireSeating: store.requireSeating ?? false,
				requirePrepaid: store.requirePrepaid ?? true,
			}
		: {
				name: "",
				description: "",
				defaultLocale: "tw",
				defaultCountry: "TW",
				defaultCurrency: "twd",
				defaultTimezone: "Asia/Taipei",
				autoAcceptOrder: false,
				isOpen: false,
				acceptAnonymousOrder: true,
				useBusinessHours: true,
				businessHours: "",
				requireSeating: false,
				requirePrepaid: true,
			};

	const form = useForm<FormValues>({
		resolver: zodResolver(updateStoreBasicSchema) as Resolver<FormValues>,
		defaultValues,
		mode: "onChange",
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
	const useBusinessHours = form.watch("useBusinessHours");
	const originalStoreName = store?.name || "";

	useEffect(() => {
		setBusinessHoursExpanded(Boolean(useBusinessHours));
	}, [useBusinessHours]);

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
							t("store_name_taken") ||
							"Store name is already taken. Please choose a different name.",
					});
				} else {
					// Slug is available
					form.clearErrors("name");
				}
			} catch (_error) {
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

	const onSubmit = async (data: FormValues) => {
		try {
			setLoading(true);

			const payload: Omit<UpdateStoreBasicInput, "storeId"> = {
				name: data.name,
				description: data.description ?? "",
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
				<CardContent
					className="relative"
					aria-busy={loading || form.formState.isSubmitting}
				>
					{(loading || form.formState.isSubmitting) && (
						<div
							className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
							aria-hidden="true"
						>
							<div className="flex flex-col items-center gap-3">
								<Loader />
								<span className="text-sm font-medium text-muted-foreground">
									{t("saving") || "Saving..."}
								</span>
							</div>
						</div>
					)}
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex w-full flex-col gap-4 space-y-0"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("store_settings_store_name")}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												className="font-mono"
												placeholder={t("store_settings_store_name_descr")}
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
									name="description"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("store_settings_store_description")}
											</FormLabel>
											<FormControl>
												<Textarea
													disabled={loading || form.formState.isSubmitting}
													className="font-mono min-h-20"
													placeholder={`${t("input_placeholder_1")}${t("store_settings_store_description")}`}
													{...field}
													value={field.value ?? ""}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("store_settings_store_description_descr")}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-1 gap-1">
								<div>
									<p className="text-sm font-medium leading-none mb-2">
										{t("store_settings_store_logo")}
									</p>
									<LogoUploadField
										storeId={params.storeId as string}
										initialUrl={store?.logo ?? ""}
										initialKey={store?.logoPublicId ?? ""}
										disabled={loading || form.formState.isSubmitting}
										onLogoChanged={() => {}}
									/>
								</div>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-1 gap-1">
								<div>
									<p className="text-sm font-medium leading-none mb-2">
										{t("store_settings_store_home_background_video")}
									</p>
									<p className="text-xs font-mono text-gray-500 mb-2">
										{t("store_settings_store_home_background_video_descr")}
									</p>
									<StoreHomeVideoUploadField
										storeId={params.storeId as string}
										initialUrl={storeSettings?.aboutUsVideoUrl ?? ""}
										disabled={loading || form.formState.isSubmitting}
										onVideoChanged={() => {}}
									/>
								</div>
							</div>

							<div className="grid grid-flow-row-dense grid-cols-2 gap-1">
								<FormField
									control={form.control}
									name="defaultLocale"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{t("store_settings_store_locale")}{" "}
												<span className="text-destructive">*</span>
											</FormLabel>
											<Select
												disabled={loading || form.formState.isSubmitting}
												onValueChange={field.onChange}
												defaultValue={field.value}
											>
												<SelectTrigger className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
													<SelectValue
														placeholder={t("store_settings_store_locale_descr")}
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
												{t("store_settings_store_currency")}{" "}
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
												{t("store_settings_store_country")}{" "}
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
											<FormLabel>
												{t("store_settings_store_timezone")}
											</FormLabel>
											<FormControl>
												<TimezoneSelect
													value={field.value ?? "Asia/Taipei"}
													onValueChange={field.onChange}
													disabled={loading || form.formState.isSubmitting}
												/>
											</FormControl>
											<FormDescription className="text-xs font-mono text-gray-500">
												{t("store_settings_store_timezone_descr")}
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
												<FormLabel>{t("store_settings_is_open")}</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_settings_is_open_descr")}
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
													{t("store_settings_use_business_hours")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_settings_use_business_hours_descr")}
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
											<button
												type="button"
												className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-left touch-manipulation disabled:pointer-events-none disabled:opacity-50"
												onClick={() =>
													setBusinessHoursExpanded((open) => !open)
												}
												aria-expanded={businessHoursExpanded}
												aria-controls="store-business-hours-editor"
												disabled={
													loading ||
													form.formState.isSubmitting ||
													!useBusinessHours
												}
											>
												<span className="text-sm font-medium leading-none">
													{t("business_hours")}
												</span>
												<IconChevronDown
													className={cn(
														"h-4 w-4 shrink-0 text-muted-foreground transition-transform",
														businessHoursExpanded && "rotate-180",
													)}
													aria-hidden
												/>
											</button>
											{businessHoursExpanded && (
												<>
													<FormControl>
														<div id="store-business-hours-editor">
															<BusinessHoursEditor
																disabled={
																	loading ||
																	form.formState.isSubmitting ||
																	!useBusinessHours
																}
																value={field.value ?? ""}
																onChange={field.onChange}
																defaultTimezone={
																	form.watch("defaultTimezone") ?? "Asia/Taipei"
																}
															/>
														</div>
													</FormControl>
													<FormDescription className="text-xs font-mono text-gray-500">
														{t("business_hours_editor_section_descr")}
													</FormDescription>
												</>
											)}
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
													{t("store_settings_require_seating")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_settings_require_seating_descr")}
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
													{t("store_settings_require_prepay")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_settings_require_prepay_descr")}
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
							<div className="grid grid-flow-row-dense grid-cols-1 gap-1">
								<FormField
									control={form.control}
									name="autoAcceptOrder"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between pr-3 rounded-lg shadow-sm">
											<div className="space-y-0.5">
												<FormLabel>
													{t("store_settings_auto_accept_order")}
												</FormLabel>
												<FormDescription className="text-xs font-mono text-gray-500">
													{t("store_settings_auto_accept_order_descr")}
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

							{/* Validation Error Summary */}
							{Object.keys(form.formState.errors).length > 0 && (
								<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
									<div className="text-sm font-semibold text-destructive">
										{t("please_fix_validation_errors") ||
											"Please fix the following errors:"}
									</div>
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels using i18n
											const fieldLabels: Record<string, string> = {
												name: t("store_name") || "Store Name",
												defaultLocale: t("Default_Locale") || "Default Locale",
												defaultCountry:
													t("Default_Country") || "Default Country",
												defaultCurrency:
													t("Default_Currency") || "Default Currency",
												defaultTimezone:
													t("default_timezone") || "Default Timezone",
												businessHours: t("business_hours") || "Business Hours",
												description: t("description") || "Description",
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

							<AdminSettingsTabFormFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => {
										router.push("../");
									}}
									disabled={loading || form.formState.isSubmitting}
									className="touch-manipulation disabled:opacity-25"
								>
									{t("cancel")}
								</Button>
								<Button
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="touch-manipulation disabled:opacity-25"
									type="submit"
								>
									{t("save")}
								</Button>
							</AdminSettingsTabFormFooter>
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

"use client";

import { updateLocaleAction } from "@/actions/sysAdmin/locale/update-locale";
import { updateLocaleSchema } from "@/actions/sysAdmin/locale/update-locale.validation";
import { useTranslation } from "@/app/i18n/client";
import { CurrencyCombobox } from "@/components/currency-combobox";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import type { LocaleColumn } from "../locale-column";

type FormValues = z.infer<typeof updateLocaleSchema>;

interface EditLocaleDialogProps {
	locale?: LocaleColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (locale: LocaleColumn) => void;
	onUpdated?: (locale: LocaleColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditLocaleDialog({
	locale,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditLocaleDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(locale) && !isNew;

	const defaultValues = useMemo<FormValues>(
		() => ({
			id: locale?.id ?? "new",
			name: locale?.name ?? "",
			lng: locale?.lng ?? "",
			defaultCurrencyId: locale?.defaultCurrencyId ?? "TWD",
		}),
		[locale],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(updateLocaleSchema) as Resolver<FormValues>,
		defaultValues,
		mode: "onChange",
	});

	useEffect(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	const handleOpenChange = useCallback(
		(nextOpen: boolean) => {
			setOpen(nextOpen);
			if (!nextOpen) {
				form.reset(defaultValues);
			}
		},
		[defaultValues, form, setOpen],
	);

	const handleSuccess = useCallback(
		(result: LocaleColumn) => {
			if (isEditMode) {
				onUpdated?.(result);
			} else {
				onCreated?.(result);
			}

			toastSuccess({
				title: isEditMode ? "Locale updated" : "Locale created",
				description: "",
			});

			form.reset(defaultValues);
			handleOpenChange(false);
		},
		[defaultValues, form, handleOpenChange, isEditMode, onCreated, onUpdated],
	);

	const onSubmit = async (values: FormValues) => {
		try {
			setLoading(true);

			const result = await updateLocaleAction({
				id: values.id,
				name: values.name,
				lng: values.lng,
				defaultCurrencyId: values.defaultCurrencyId,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data) {
				const localeData: LocaleColumn = {
					id: result.data.id,
					name: result.data.name,
					lng: result.data.lng,
					defaultCurrencyId: result.data.defaultCurrencyId,
				};
				handleSuccess(localeData);
			}
		} catch (error: unknown) {
			toastError({
				title: t("error_title"),
				description: error instanceof Error ? error.message : String(error),
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? "Edit Locale" : "Create Locale"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode
							? "Update locale information."
							: "Add a new locale to the system."}
					</DialogDescription>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										ID <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled={
												loading || form.formState.isSubmitting || isEditMode
											}
											placeholder={isEditMode ? undefined : "e.g., tw"}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Name <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled={loading || form.formState.isSubmitting}
											placeholder="e.g., Traditional Chinese"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="lng"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Language Code <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											{...field}
											disabled={
												loading || form.formState.isSubmitting || isEditMode
											}
											placeholder="e.g., tw"
											maxLength={2}
											onChange={(e) => {
												field.onChange(e.target.value.toLowerCase());
											}}
										/>
									</FormControl>
									<FormDescription>
										{isEditMode
											? "Language code cannot be changed after creation."
											: "2-digit language code (e.g., tw, en, ja)"}
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="defaultCurrencyId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										Default Currency <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<CurrencyCombobox
											disabled={loading || form.formState.isSubmitting}
											defaultValue={field.value || "TWD"}
											onValueChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={loading || form.formState.isSubmitting}
							>
								{isEditMode ? "Update" : "Create"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

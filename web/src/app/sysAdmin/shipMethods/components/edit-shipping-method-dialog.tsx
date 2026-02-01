"use client";

import { createShippingMethodAction } from "@/actions/sysAdmin/shippingMethod/create-shipping-method";
import { updateShippingMethodAction } from "@/actions/sysAdmin/shippingMethod/update-shipping-method";
import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
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
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ShippingMethodColumn } from "../shipping-method-column";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	identifier: z.string().default(""),
	description: z.string().optional().nullable(),
	basic_price: z.coerce.number().default(0),
	currencyId: z.string().min(1).default("twd"),
	isDeleted: z.boolean().default(false),
	isDefault: z.boolean().default(false),
	shipRequired: z.boolean().default(true),
	canDelete: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface EditShippingMethodDialogProps {
	shippingMethod?: ShippingMethodColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (shippingMethod: ShippingMethodColumn) => void;
	onUpdated?: (shippingMethod: ShippingMethodColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditShippingMethodDialog({
	shippingMethod,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditShippingMethodDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(shippingMethod) && !isNew;

	const defaultValues = useMemo<FormValues>(
		() => ({
			name: shippingMethod?.name ?? "",
			identifier: shippingMethod?.identifier ?? "",
			description: shippingMethod?.description ?? null,
			basic_price: shippingMethod?.basic_price ?? 0,
			currencyId: shippingMethod?.currencyId ?? "twd",
			isDeleted: shippingMethod?.isDeleted ?? false,
			isDefault: shippingMethod?.isDefault ?? false,
			shipRequired: shippingMethod?.shipRequired ?? true,
			canDelete: shippingMethod?.canDelete ?? false,
		}),
		[shippingMethod],
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
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
		(result: ShippingMethodColumn) => {
			if (isEditMode) {
				onUpdated?.(result);
			} else {
				onCreated?.(result);
			}

			toastSuccess({
				title: isEditMode
					? "Shipping method updated"
					: "Shipping method created",
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

			if (isEditMode && shippingMethod) {
				const result = await updateShippingMethodAction({
					id: shippingMethod.id,
					...values,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.shippingMethod) {
					handleSuccess(result.data.shippingMethod);
				}
			} else {
				const result = await createShippingMethodAction(values);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.shippingMethod) {
					handleSuccess(result.data.shippingMethod);
				}
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
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditMode ? "Edit Shipping Method" : "Create Shipping Method"}
					</DialogTitle>
					<DialogDescription>
						Manage shipping method settings and configuration.
					</DialogDescription>
				</DialogHeader>
				<div className="relative">
					{(loading || form.formState.isSubmitting) && (
						<div
							className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]"
							aria-hidden="true"
						>
							<div className="flex flex-col items-center gap-3">
								<Loader />
								<span className="text-sm font-medium text-muted-foreground">
									Saving...
								</span>
							</div>
						</div>
					)}
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
													disabled={loading || form.formState.isSubmitting}
													placeholder="Shipping method name"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="identifier"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Identifier</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="identifier"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem className="sm:col-span-2">
											<FormLabel>Description</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="Description"
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
									name="basic_price"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Basic Price <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													type="number"
													step="0.01"
													disabled={loading || form.formState.isSubmitting}
													placeholder="0"
													{...field}
													value={field.value ?? ""}
													onChange={(e) =>
														field.onChange(Number(e.target.value))
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="currencyId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												Currency ID <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input
													disabled={loading || form.formState.isSubmitting}
													placeholder="twd"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="isDefault"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
											<div className="space-y-0.5">
												<FormLabel>Is Default</FormLabel>
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
									name="isDeleted"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
											<div className="space-y-0.5">
												<FormLabel>Is Deleted</FormLabel>
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
									name="shipRequired"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
											<div className="space-y-0.5">
												<FormLabel>Shipment Required</FormLabel>
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
									name="canDelete"
									render={({ field }) => (
										<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
											<div className="space-y-0.5">
												<FormLabel>Can Delete</FormLabel>
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
								<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
									<div className="text-sm font-semibold text-destructive">
										{t("please_fix_validation_errors") ||
											"Please fix the following errors:"}
									</div>
									{Object.entries(form.formState.errors).map(
										([field, error]) => {
											// Map field names to user-friendly labels
											const fieldLabels: Record<string, string> = {
												name: t("Name") || "Name",
												identifier: t("Identifier") || "Identifier",
												description: t("Description") || "Description",
												basic_price: t("Basic_Price") || "Basic Price",
												currencyId: t("Currency") || "Currency",
												isDeleted: t("Deleted") || "Deleted",
												isDefault: t("Default") || "Default",
												shipRequired: t("Ship_Required") || "Ship Required",
												canDelete: t("Can_Delete") || "Can Delete",
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

							<DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
								<Button
									type="button"
									variant="outline"
									onClick={() => handleOpenChange(false)}
									disabled={loading || form.formState.isSubmitting}
								>
									{t("cancel")}
								</Button>
								<Button
									type="submit"
									disabled={
										loading ||
										!form.formState.isValid ||
										form.formState.isSubmitting
									}
									className="disabled:opacity-25"
								>
									{isEditMode ? t("save") : t("create")}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</div>
			</DialogContent>
		</Dialog>
	);
}

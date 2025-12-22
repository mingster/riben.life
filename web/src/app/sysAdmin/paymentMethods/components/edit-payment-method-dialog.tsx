"use client";

import { createPaymentMethodAction } from "@/actions/sysAdmin/paymentMethod/create-payment-method";
import { updatePaymentMethodAction } from "@/actions/sysAdmin/paymentMethod/update-payment-method";
import { useTranslation } from "@/app/i18n/client";
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
import type { PaymentMethodColumn } from "../payment-method-column";

const formSchema = z.object({
	name: z.string().min(1, "Name is required"),
	payUrl: z.string().default(""),
	priceDescr: z.string().default(""),
	fee: z.coerce.number().default(0.029),
	feeAdditional: z.coerce.number().default(0),
	clearDays: z.coerce.number().int().default(3),
	isDeleted: z.boolean().default(false),
	isDefault: z.boolean().default(false),
	canDelete: z.boolean().default(false),
	visibleToCustomer: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

interface EditPaymentMethodDialogProps {
	paymentMethod?: PaymentMethodColumn | null;
	isNew?: boolean;
	trigger?: React.ReactNode;
	onCreated?: (paymentMethod: PaymentMethodColumn) => void;
	onUpdated?: (paymentMethod: PaymentMethodColumn) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditPaymentMethodDialog({
	paymentMethod,
	isNew = false,
	trigger,
	onCreated,
	onUpdated,
	open: controlledOpen,
	onOpenChange: setControlledOpen,
}: EditPaymentMethodDialogProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "sysAdmin");

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const open = controlledOpen ?? internalOpen;
	const setOpen = setControlledOpen ?? setInternalOpen;

	const isEditMode = Boolean(paymentMethod) && !isNew;

	const defaultValues = useMemo<FormValues>(
		() => ({
			name: paymentMethod?.name ?? "",
			payUrl: paymentMethod?.payUrl ?? "",
			priceDescr: paymentMethod?.priceDescr ?? "",
			fee: paymentMethod?.fee ?? 0.029,
			feeAdditional: paymentMethod?.feeAdditional ?? 0,
			clearDays: paymentMethod?.clearDays ?? 3,
			isDeleted: paymentMethod?.isDeleted ?? false,
			isDefault: paymentMethod?.isDefault ?? false,
			canDelete: paymentMethod?.canDelete ?? false,
			visibleToCustomer: paymentMethod?.visibleToCustomer ?? false,
		}),
		[paymentMethod],
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
		(result: PaymentMethodColumn) => {
			if (isEditMode) {
				onUpdated?.(result);
			} else {
				onCreated?.(result);
			}

			toastSuccess({
				title: isEditMode ? "Payment method updated" : "Payment method created",
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

			if (isEditMode && paymentMethod) {
				const result = await updatePaymentMethodAction({
					id: paymentMethod.id,
					...values,
				});

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.paymentMethod) {
					handleSuccess(result.data.paymentMethod);
				}
			} else {
				const result = await createPaymentMethodAction(values);

				if (result?.serverError) {
					toastError({
						title: t("error_title"),
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.paymentMethod) {
					handleSuccess(result.data.paymentMethod);
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
						{isEditMode ? "Edit Payment Method" : "Create Payment Method"}
					</DialogTitle>
					<DialogDescription>
						Manage payment method settings and configuration.
					</DialogDescription>
				</DialogHeader>
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
												placeholder="Payment method name"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="payUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Pay URL</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="payUrl"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="priceDescr"
								render={({ field }) => (
									<FormItem className="sm:col-span-2">
										<FormLabel>Price Description</FormLabel>
										<FormControl>
											<Input
												disabled={loading || form.formState.isSubmitting}
												placeholder="Price description"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="fee"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Fee (%) <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.001"
												disabled={loading || form.formState.isSubmitting}
												placeholder="0.029"
												{...field}
												value={field.value ?? ""}
												onChange={(e) => field.onChange(Number(e.target.value))}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="feeAdditional"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Fee Additional</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												disabled={loading || form.formState.isSubmitting}
												placeholder="0"
												{...field}
												value={field.value ?? ""}
												onChange={(e) => field.onChange(Number(e.target.value))}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="clearDays"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Clear Days <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												disabled={loading || form.formState.isSubmitting}
												placeholder="3"
												{...field}
												value={field.value ?? ""}
												onChange={(e) => field.onChange(Number(e.target.value))}
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

							<FormField
								control={form.control}
								name="visibleToCustomer"
								render={({ field }) => (
									<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
										<div className="space-y-0.5">
											<FormLabel>Visible To Customer</FormLabel>
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
							>
								{isEditMode ? t("save") : t("create")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

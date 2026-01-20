"use client";

import { refillCustomerFiatAction } from "@/actions/storeAdmin/customer/refill-customer-fiat";
import {
	refillCustomerFiatSchema,
	type RefillCustomerFiatInput,
} from "@/actions/storeAdmin/customer/refill-customer-fiat.validation";
import { useTranslation } from "@/app/i18n/client";
import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

interface RefillFiatBalanceDialogProps {
	user: User;
	trigger?: React.ReactNode;
	onRefilled?: (totalFiat: number) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * This dialog is used to refill fiat balance for a user.
 * Similar to RefillCreditPointDialog but for fiat currency instead of credit points.
 */
export function RefillFiatBalanceDialog({
	user,
	trigger,
	onRefilled,
	open,
	onOpenChange,
}: RefillFiatBalanceDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const defaultValues: RefillCustomerFiatInput = {
		userId: user.id,
		fiatAmount: 0, // Will be set to cashAmount when isPaid=true, or entered separately when isPaid=false
		cashAmount: 0,
		isPaid: true,
		note: null,
	};

	const form = useForm<RefillCustomerFiatInput>({
		resolver: zodResolver(
			refillCustomerFiatSchema,
		) as Resolver<RefillCustomerFiatInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	// Sync fiatAmount with cashAmount when isPaid is true
	const isPaid = form.watch("isPaid");
	const cashAmount = form.watch("cashAmount");
	useEffect(() => {
		if (isPaid && cashAmount > 0) {
			// When paid, fiatAmount always equals cashAmount
			form.setValue("fiatAmount", cashAmount, { shouldValidate: true });
		} else if (!isPaid) {
			// When promotional, reset cashAmount
			form.setValue("cashAmount", 0, { shouldValidate: true });
		}
	}, [isPaid, cashAmount, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	};

	const onSubmit = async (values: RefillCustomerFiatInput) => {
		try {
			setLoading(true);

			// fiatAmount always equals cashAmount when paid, otherwise use fiatAmount for promotional
			const fiatAmount = values.isPaid ? values.cashAmount : values.fiatAmount;

			const result = await refillCustomerFiatAction(String(params.storeId), {
				userId: user.id,
				fiatAmount: fiatAmount,
				cashAmount: values.cashAmount,
				isPaid: values.isPaid,
				note: values.note || null,
			});

			if (result?.serverError) {
				toastError({
					title: t("error_title"),
					description: result.serverError,
				});
				return;
			}

			if (result?.data) {
				const refillType = values.isPaid
					? t("customer_fiat_in_person_payment") || "In-Person Payment"
					: t("customer_fiat_promotional_payment") || "Promotional";
				toastSuccess({
					title: t("success_title"),
					description: t("customer_fiat_refilld") || "Fiat Balance Recharged",
				});
				resetForm();
				handleOpenChange(false);
				// Pass the updated total fiat balance to parent
				onRefilled?.(result.data.totalFiat ?? result.data.amount);
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

	let dialogDescription =
		t("customer_fiat_refill_description") ||
		"Add fiat balance to {0}'s account";
	dialogDescription = dialogDescription.replace("{0}", user.name || user.email);

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("customer_fiat_refill") || "Recharge Fiat Balance"}
					</DialogTitle>
					<DialogDescription className="text-xs font-mono text-muted-foreground">
						{dialogDescription}
					</DialogDescription>
				</DialogHeader>

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
						className="space-y-4"
					>
						<FormField
							control={form.control}
							name="isPaid"
							render={({ field }) => (
								<FormItem className="flex flex-row items-start space-x-3 space-y-0">
									<FormControl>
										<Checkbox
											checked={field.value}
											onCheckedChange={field.onChange}
											disabled={loading || form.formState.isSubmitting}
										/>
									</FormControl>
									<div className="space-y-1 leading-none">
										<FormLabel>
											{t("customer_fiat_paid_in_person") ||
												"Customer Paid In Person"}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("customer_fiat_paid_in_person_description") ||
												"Check if customer paid cash in person. Leave unchecked for promotional fiat balance."}
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						{form.watch("isPaid") ? (
							<FormField
								control={form.control}
								name="cashAmount"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											{t("customer_fiat_cash_amount") || "Cash Amount"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												min="0.01"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined && field.value !== null
														? field.value.toString()
														: "0"
												}
												onChange={(event) => {
													const value = event.target.value;
													const numValue = value ? Number.parseFloat(value) : 0;
													field.onChange(numValue);
													// Sync fiatAmount with cashAmount
													form.setValue("fiatAmount", numValue, {
														shouldValidate: true,
													});
												}}
												placeholder="0.00"
												className={cn(
													"h-10 text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											/>
										</FormControl>
										<FormMessage />
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("customer_fiat_cash_amount_required_when_paid") ||
												"Cash amount is required when customer paid in person. This amount will be added to the customer's fiat balance."}
										</FormDescription>
									</FormItem>
								)}
							/>
						) : (
							<FormField
								control={form.control}
								name="fiatAmount"
								render={({ field, fieldState }) => (
									<FormItem
										className={cn(
											fieldState.error &&
												"rounded-md border border-destructive/50 bg-destructive/5 p-2",
										)}
									>
										<FormLabel>
											{t("customer_fiat_amount") || "Fiat Amount"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<Input
												type="number"
												step="0.01"
												min="0.01"
												disabled={loading || form.formState.isSubmitting}
												value={
													field.value !== undefined && field.value !== null
														? field.value.toString()
														: ""
												}
												onChange={(event) => {
													const value = event.target.value;
													field.onChange(value ? Number.parseFloat(value) : 0);
												}}
												placeholder="0.00"
												className={cn(
													"h-10 text-base sm:h-9 sm:text-sm",
													fieldState.error &&
														"border-destructive focus-visible:ring-destructive",
												)}
											/>
										</FormControl>
										<FormMessage />
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("customer_fiat_promotional_amount_description") ||
												"Enter the promotional fiat amount to add to the customer's balance."}
										</FormDescription>
									</FormItem>
								)}
							/>
						)}

						<FormField
							control={form.control}
							name="note"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("note") || "Note"} ({t("optional") || "Optional"})
									</FormLabel>
									<FormControl>
										<Textarea
											disabled={loading || form.formState.isSubmitting}
											value={field.value ?? ""}
											onChange={(event) =>
												field.onChange(event.target.value || null)
											}
											placeholder={
												t("customer_fiat_refill_note_placeholder") ||
												"Optional note for this refill"
											}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						{/* Validation Error Summary */}
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									// Map field names to user-friendly labels using i18n
									const fieldLabels: Record<string, string> = {
										userId: t("user") || "User",
										fiatAmount: t("customer_fiat_amount") || "Fiat Amount",
										cashAmount: t("customer_fiat_cash_amount") || "Cash Amount",
										isPaid: t("is_paid") || "Is Paid",
										note: t("note") || "Note",
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
								})}
							</div>
						)}

						<DialogFooter className="flex w-full justify-end space-x-2">
							<Button
								type="submit"
								disabled={
									loading ||
									!form.formState.isValid ||
									form.formState.isSubmitting
								}
								className="disabled:opacity-25"
							>
								{t("customer_fiat_refill") || "Recharge"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
								disabled={loading || form.formState.isSubmitting}
							>
								{t("cancel")}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

"use client";

import { refillCustomerCreditAction } from "@/actions/storeAdmin/customer/refill-customer-credit";
import {
	refillCustomerCreditSchema,
	type RefillCustomerCreditInput,
} from "@/actions/storeAdmin/customer/refill-customer-credit.validation";
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
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";

interface RefillCreditPointDialogProps {
	user: User;
	trigger?: React.ReactNode;
	onRefilled?: (totalCredit: number) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/**
 * This dialog is used to refill credit points for a user as described in section 3.2 of
 * the [CUSTOMER-CREDIT-DESIGN.md](../../../../../doc/CUSTOMER-CREDIT-DESIGN.md) file.
 */
export function RefillCreditPointDialog({
	user,
	trigger,
	onRefilled,
	open,
	onOpenChange,
}: RefillCreditPointDialogProps) {
	const params = useParams<{ storeId: string }>();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const [internalOpen, setInternalOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const defaultValues: RefillCustomerCreditInput = {
		userId: user.id,
		creditAmount: 0,
		cashAmount: 0,
		isPaid: true,
		note: null,
	};

	const form = useForm<RefillCustomerCreditInput>({
		resolver: zodResolver(
			refillCustomerCreditSchema,
		) as Resolver<RefillCustomerCreditInput>,
		defaultValues,
		mode: "onChange",
		reValidateMode: "onChange",
	});

	const isControlled = typeof open === "boolean";
	const dialogOpen = isControlled ? open : internalOpen;

	const resetForm = useCallback(() => {
		form.reset(defaultValues);
	}, [defaultValues, form]);

	// Reset cashAmount when isPaid changes
	const isPaid = form.watch("isPaid");
	useEffect(() => {
		if (!isPaid) {
			form.setValue("cashAmount", 0, { shouldValidate: true });
		} else {
			// When isPaid is checked, ensure cashAmount is set if it's 0
			const currentCashAmount = form.getValues("cashAmount");
			if (!currentCashAmount || currentCashAmount === 0) {
				form.setValue("cashAmount", 0, { shouldValidate: true });
			}
		}
	}, [isPaid, form]);

	const handleOpenChange = (nextOpen: boolean) => {
		if (!isControlled) {
			setInternalOpen(nextOpen);
		}
		onOpenChange?.(nextOpen);
		if (!nextOpen) {
			resetForm();
		}
	};

	const onSubmit = async (values: RefillCustomerCreditInput) => {
		try {
			setLoading(true);

			const result = await refillCustomerCreditAction(String(params.storeId), {
				userId: user.id,
				creditAmount: values.creditAmount,
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
				//const { bonus, totalCredit } = result.data;
				const refillType = values.isPaid
					? t("customer_credit_in_person_payment") || "In-Person Payment"
					: t("customer_credit_promotional_payment") || "Promotional";
				toastSuccess({
					title: t("success_title"),
					description: t("customer_credit_refilld") || "Credit Recharged",
				});
				resetForm();
				handleOpenChange(false);
				onRefilled?.(result.data.totalCredit);
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
		t("customer_credit_refill_description") || "Add credit to {0}'s account";
	dialogDescription = dialogDescription.replace("{0}", user.name || user.email);

	return (
		<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-w-[calc(100%-1rem)] p-4 sm:p-6 sm:max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{t("customer_credit_refill") || "Recharge Credit"}
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
							name="creditAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("customer_credit_amount") || "Credit Amount"}
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											min="1"
											disabled={loading || form.formState.isSubmitting}
											value={
												field.value !== undefined && field.value !== null
													? field.value.toString()
													: ""
											}
											onChange={(event) => {
												const value = event.target.value;
												field.onChange(value ? Number.parseInt(value, 10) : 0);
											}}
											placeholder="0"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

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
											{t("customer_credit_paid_in_person") ||
												"Customer Paid In Person"}
										</FormLabel>
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("customer_credit_paid_in_person_description") ||
												"Check if customer paid cash in person. Leave unchecked for promotional credit."}
										</FormDescription>
									</div>
								</FormItem>
							)}
						/>

						{form.watch("isPaid") && (
							<FormField
								control={form.control}
								name="cashAmount"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{t("customer_credit_cash_amount") || "Cash Amount"} *
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
													field.onChange(value ? Number.parseFloat(value) : 0);
												}}
												placeholder="0.00"
											/>
										</FormControl>
										<FormMessage />
										<FormDescription className="text-xs font-mono text-gray-500">
											{t("customer_credit_cash_amount_required_when_paid") ||
												"Cash amount is required when customer paid in person"}
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
												t("customer_credit_refill_note_placeholder") ||
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
										creditAmount:
											t("customer_credit_amount") || "Credit Amount",
										cashAmount:
											t("customer_credit_cash_amount") || "Cash Amount",
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
								{t("customer_credit_refill") || "Recharge"}
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

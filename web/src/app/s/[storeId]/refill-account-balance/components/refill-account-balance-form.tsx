"use client";

import { useTranslation } from "@/app/i18n/client";
import { toastError } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/providers/i18n-provider";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createRefillAccountBalanceOrderAction } from "@/actions/store/credit/create-refill-account-balance-order";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Store, StorePaymentMethodMapping } from "@/types";

const refillAccountBalanceFormSchema = z.object({
	fiatAmount: z.coerce
		.number()
		.positive("Fiat amount must be positive")
		.min(0.01, "Fiat amount must be at least 0.01"),
	paymentMethodId: z.string().min(1, "Payment method is required"),
});

type RefillAccountBalanceFormValues = z.infer<
	typeof refillAccountBalanceFormSchema
>;

interface RefillAccountBalanceFormProps {
	storeId: string;
	store: Store & {
		StorePaymentMethods: StorePaymentMethodMapping[];
	};
	rsvpId?: string;
	returnUrl?: string;
	unpaidTotal?: number | null;
}

export function RefillAccountBalanceForm({
	storeId,
	store,
	rsvpId,
	returnUrl,
	unpaidTotal,
}: RefillAccountBalanceFormProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const currency = store.defaultCurrency.toUpperCase();

	// Get payment methods (exclude credit/creditPoint as they can't be used for fiat refill)
	const allPaymentMethods = (
		store.StorePaymentMethods as StorePaymentMethodMapping[]
	).filter(
		(mapping) =>
			mapping.PaymentMethod.payUrl !== "credit" &&
			mapping.PaymentMethod.payUrl !== "creditPoint",
	);

	// Default to first payment method, or Stripe if available
	let defaultPaymentMethod = allPaymentMethods.find(
		(mapping) => mapping.PaymentMethod.payUrl === "stripe",
	);
	if (!defaultPaymentMethod && allPaymentMethods.length > 0) {
		defaultPaymentMethod = allPaymentMethods[0];
	}

	const form = useForm<RefillAccountBalanceFormValues>({
		resolver: zodResolver(refillAccountBalanceFormSchema) as any,
		defaultValues: {
			fiatAmount: unpaidTotal && unpaidTotal > 0 ? unpaidTotal : 100, // Use unpaid total if available, otherwise default to 100
			paymentMethodId: defaultPaymentMethod?.methodId || "",
		},
	});

	const onSubmit = useCallback(
		async (data: RefillAccountBalanceFormValues) => {
			try {
				setIsSubmitting(true);

				// Create refill account balance order
				const result = await createRefillAccountBalanceOrderAction({
					storeId,
					fiatAmount: data.fiatAmount,
					paymentMethodId: data.paymentMethodId,
					rsvpId: rsvpId,
				});

				if (result?.serverError) {
					toastError({
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.order) {
					// Get payment method to determine redirect URL
					const selectedPaymentMethod = allPaymentMethods.find(
						(mapping) => mapping.methodId === data.paymentMethodId,
					);

					if (!selectedPaymentMethod) {
						toastError({
							description: "Payment method not found",
						});
						return;
					}

					const payUrl = selectedPaymentMethod.PaymentMethod.payUrl;

					// Redirect to payment page using standard /checkout/[orderId]/[payUrl] pattern
					// All payment methods (cash, credit, stripe, linepay, etc.) use the same URL pattern
					let paymentUrl = `/checkout/${result.data.order.id}/${payUrl}`;
					if (returnUrl) {
						paymentUrl += `?returnUrl=${encodeURIComponent(returnUrl)}`;
					}
					router.push(paymentUrl);
				}
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: "Failed to create refill account balance order",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, currency, router, allPaymentMethods, rsvpId, returnUrl],
	);

	// Calculate preset amounts based on unpaid total
	// If unpaid total exists and is > 0, use it as the only preset
	// Otherwise, use common fiat amounts
	const presetAmounts = useMemo(() => {
		if (unpaidTotal && unpaidTotal > 0) {
			return [unpaidTotal];
		}

		// Default presets if no unpaid total
		return [100, 200, 500, 1000, 2000, 5000];
	}, [unpaidTotal]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{t("refill_account_balance") || "Refill Account Balance"}
				</CardTitle>
				<CardDescription>
					{t("refill_account_balance_description")}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{presetAmounts.length > 0 && (
							<div className="space-y-2">
								<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									{t("select") || "Select"}
								</label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{presetAmounts.map((amount) => {
										return (
											<Button
												key={amount}
												type="button"
												variant="outline"
												onClick={() => form.setValue("fiatAmount", amount)}
												className="h-10 sm:h-9 flex flex-row"
											>
												<span className="font-semibold">
													{amount.toLocaleString()} {currency}
												</span>
											</Button>
										);
									})}
								</div>
							</div>
						)}

						<FormField
							control={form.control}
							name="fiatAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("amount") || "Amount"}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											step="0.01"
											min="0.01"
											placeholder={t("enter_amount") || "Enter amount"}
											className="h-10 text-base sm:text-sm"
											{...field}
											onChange={(e) => {
												const value = e.target.value;
												field.onChange(value === "" ? "" : Number(value));
											}}
										/>
									</FormControl>
									<p className="text-sm text-muted-foreground">
										{t("currency") || "Currency"}: {currency}
									</p>
									<FormMessage />
								</FormItem>
							)}
						/>

						{allPaymentMethods.length > 0 && (
							<FormField
								control={form.control}
								name="paymentMethodId"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="pb-2">
											{t("checkout_paymentMethod") || "Payment Method"}{" "}
											<span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<RadioGroup
												className="pt-2"
												value={field.value}
												onValueChange={field.onChange}
											>
												{allPaymentMethods.map((mapping) => (
													<div
														key={mapping.methodId}
														className="flex items-center gap-3"
													>
														<RadioGroupItem
															value={mapping.methodId}
															id={mapping.methodId}
														/>
														<Label htmlFor={mapping.methodId}>
															{mapping.paymentDisplayName !== null &&
															mapping.paymentDisplayName !== ""
																? mapping.paymentDisplayName
																: mapping.PaymentMethod.name}
														</Label>
													</div>
												))}
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}

						{/* Validation Error Summary */}
						{Object.keys(form.formState.errors).length > 0 && (
							<div className="rounded-md bg-destructive/15 border border-destructive/50 p-3 space-y-1.5 mb-4">
								<div className="text-sm font-semibold text-destructive">
									{t("please_fix_validation_errors") ||
										"Please fix the following errors:"}
								</div>
								{Object.entries(form.formState.errors).map(([field, error]) => {
									// Map field names to user-friendly labels using i18n
									const fieldLabels: Record<string, string> = {
										fiatAmount: t("Fiat_Amount") || "Fiat Amount",
										paymentMethodId: t("Payment_Method") || "Payment Method",
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

						<Button
							type="submit"
							disabled={
								isSubmitting ||
								!form.formState.isValid ||
								form.formState.isSubmitting
							}
							className="w-full h-10 sm:h-9 disabled:opacity-25"
						>
							{isSubmitting
								? t("processing") || "Processing..."
								: t("continue_to_payment") || "Continue to Payment"}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

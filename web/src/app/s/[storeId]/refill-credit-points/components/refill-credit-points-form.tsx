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

import { createRefillCreditPointsOrderAction } from "@/actions/store/credit/create-recharge-order";
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

const refillCreditPointsFormSchema = z.object({
	creditAmount: z.coerce
		.number()
		.positive("Credit points amount must be positive")
		.min(1, "Credit points amount must be at least 1 point"),
	paymentMethodId: z.string().min(1, "Payment method is required"),
});

type RefillCreditPointsFormValues = z.infer<
	typeof refillCreditPointsFormSchema
>;

interface RefillCreditPointsFormProps {
	storeId: string;
	store: Store & {
		StorePaymentMethods: StorePaymentMethodMapping[];
	};
	rsvpId?: string;
	returnUrl?: string;
}

export function RefillCreditPointsForm({
	storeId,
	store,
	rsvpId,
	returnUrl,
}: RefillCreditPointsFormProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const minPurchase = store.creditMinPurchase
		? Number(store.creditMinPurchase)
		: 0;
	const maxPurchase = store.creditMaxPurchase
		? Number(store.creditMaxPurchase)
		: 0;
	const creditExchangeRate = store.creditExchangeRate
		? Number(store.creditExchangeRate)
		: 0;
	const currency = store.defaultCurrency.toUpperCase();

	// Get payment methods
	const allPaymentMethods =
		store.StorePaymentMethods as StorePaymentMethodMapping[];

	// Default to first payment method, or Stripe if available
	let defaultPaymentMethod = allPaymentMethods.find(
		(mapping) => mapping.PaymentMethod.payUrl === "stripe",
	);
	if (!defaultPaymentMethod && allPaymentMethods.length > 0) {
		defaultPaymentMethod = allPaymentMethods[0];
	}

	const form = useForm<RefillCreditPointsFormValues>({
		resolver: zodResolver(refillCreditPointsFormSchema) as any,
		defaultValues: {
			creditAmount: minPurchase > 0 ? minPurchase : 100,
			paymentMethodId: defaultPaymentMethod?.methodId || "",
		},
	});

	// Calculate dollar amount from credit amount
	const creditAmount = form.watch("creditAmount");
	const dollarAmount = useMemo(() => {
		if (!creditAmount || creditAmount <= 0 || creditExchangeRate <= 0) return 0;
		return creditAmount * creditExchangeRate;
	}, [creditAmount, creditExchangeRate]);

	const onSubmit = useCallback(
		async (data: RefillCreditPointsFormValues) => {
			try {
				setIsSubmitting(true);

				// Validate against store limits (in credit points)
				if (minPurchase > 0 && data.creditAmount < minPurchase) {
					toastError({
						description: t("credit_min_purchase_error", {
							points: minPurchase,
						}),
					});
					return;
				}

				if (maxPurchase > 0 && data.creditAmount > maxPurchase) {
					toastError({
						description: t("credit_max_purchase_error", {
							points: maxPurchase,
						}),
					});
					return;
				}

				// Create refill credit points order
				const result = await createRefillCreditPointsOrderAction({
					storeId,
					creditAmount: data.creditAmount,
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
							: "Failed to create refill credit points order",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, minPurchase, maxPurchase, currency, router, allPaymentMethods],
	);

	// Preset amounts: start with minPurchase, then 3 multiples
	const presetAmounts = useMemo(() => {
		if (minPurchase > 0) {
			// Generate: minPurchase, minPurchase * 2, minPurchase * 3, minPurchase * 4
			const amounts = [minPurchase, minPurchase * 2, minPurchase * 3].filter(
				(amount) => {
					// Filter out amounts that exceed maxPurchase if set
					if (maxPurchase > 0 && amount > maxPurchase) return false;
					return true;
				},
			);
			return amounts;
		}
		// Fallback if no minPurchase: use default values
		return [20, 40, 60, 80].filter((amount) => {
			if (maxPurchase > 0 && amount > maxPurchase) return false;
			return true;
		});
	}, [minPurchase, maxPurchase]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("credit_recharge")}</CardTitle>
				<CardDescription></CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{presetAmounts.length > 0 && (
							<div className="space-y-2">
								<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									{t("credit_quick_select")}
								</label>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{presetAmounts.map((amount) => {
										const dollarAmount =
											creditExchangeRate > 0 ? amount * creditExchangeRate : 0;
										return (
											<Button
												key={amount}
												type="button"
												variant="outline"
												onClick={() => form.setValue("creditAmount", amount)}
												className="h-10 sm:h-9 flex flex-row"
											>
												<span className="font-semibold">
													{amount} {t("points")}
												</span>
												{creditExchangeRate > 0 && (
													<span className="text-xs text-muted-foreground">
														{dollarAmount.toLocaleString()} {currency}
													</span>
												)}
											</Button>
										);
									})}
								</div>
							</div>
						)}

						<FormField
							control={form.control}
							name="creditAmount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("credit_recharge_amount")}{" "}
										<span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											placeholder={t("credit_enter_points")}
											className="h-10 text-base sm:text-sm"
											{...field}
											onChange={(e) => {
												const value = e.target.value;
												field.onChange(value === "" ? "" : Number(value));
											}}
										/>
									</FormControl>
									{dollarAmount > 0 && (
										<p className="text-sm text-muted-foreground">
											{t("credit_total_amount")}:{" "}
											{dollarAmount.toLocaleString()} {currency}
										</p>
									)}
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
											{t("checkout_paymentMethod")}{" "}
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

						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full h-10 sm:h-9"
						>
							{isSubmitting
								? t("credit_processing")
								: t("credit_continue_to_payment")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

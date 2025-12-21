"use client";

import { useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { toastError } from "@/components/toaster";
import { createRechargeOrderAction } from "@/actions/store/credit/create-recharge-order";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Store } from "@/types";

const rechargeFormSchema = z.object({
	creditAmount: z.coerce
		.number()
		.positive("Credit amount must be positive")
		.min(1, "Credit amount must be at least 1 point"),
});

type RechargeFormValues = z.infer<typeof rechargeFormSchema>;

interface RechargeFormProps {
	storeId: string;
	store: Store;
	rsvpId?: string;
}

export function RechargeForm({ storeId, store, rsvpId }: RechargeFormProps) {
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

	const form = useForm<RechargeFormValues>({
		resolver: zodResolver(rechargeFormSchema) as any,
		defaultValues: {
			creditAmount: minPurchase > 0 ? minPurchase : 100,
		},
	});

	// Calculate dollar amount from credit amount
	const creditAmount = form.watch("creditAmount");
	const dollarAmount = useMemo(() => {
		if (!creditAmount || creditAmount <= 0 || creditExchangeRate <= 0) return 0;
		return creditAmount * creditExchangeRate;
	}, [creditAmount, creditExchangeRate]);

	const onSubmit = useCallback(
		async (data: RechargeFormValues) => {
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

				// Create recharge order
				const result = await createRechargeOrderAction({
					storeId,
					creditAmount: data.creditAmount,
					rsvpId: rsvpId,
				});

				if (result?.serverError) {
					toastError({
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.order) {
					// Redirect to Stripe payment page
					router.push(`/s/${storeId}/recharge/${result.data.order.id}/stripe`);
				}
			} catch (error) {
				toastError({
					description:
						error instanceof Error
							? error.message
							: "Failed to create recharge order",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, minPurchase, maxPurchase, currency, router],
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

"use client";

import { useState, useCallback } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Store } from "@/types";

const rechargeFormSchema = z.object({
	amount: z.coerce
		.number()
		.positive("Amount must be positive")
		.min(1, "Amount must be at least 1"),
});

type RechargeFormValues = z.infer<typeof rechargeFormSchema>;

interface RechargeFormProps {
	storeId: string;
	store: Store;
}

export function RechargeForm({ storeId, store }: RechargeFormProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);

	const minPurchase = store.creditMinPurchase ? Number(store.creditMinPurchase) : 0;
	const maxPurchase = store.creditMaxPurchase ? Number(store.creditMaxPurchase) : 0;
	const currency = store.defaultCurrency.toUpperCase();

	const form = useForm<RechargeFormValues>({
		resolver: zodResolver(rechargeFormSchema) as any,
		defaultValues: {
			amount: minPurchase > 0 ? minPurchase : 100,
		},
	});

	const onSubmit = useCallback(
		async (data: RechargeFormValues) => {
			try {
				setIsSubmitting(true);

				// Validate against store limits
				if (minPurchase > 0 && data.amount < minPurchase) {
					toastError({
						description: `Minimum purchase amount is ${minPurchase} ${currency}`,
					});
					return;
				}

				if (maxPurchase > 0 && data.amount > maxPurchase) {
					toastError({
						description: `Maximum purchase amount is ${maxPurchase} ${currency}`,
					});
					return;
				}

				// Create recharge order
				const result = await createRechargeOrderAction({
					storeId,
					amount: data.amount,
				});

				if (result?.serverError) {
					toastError({
						description: result.serverError,
					});
					return;
				}

				if (result?.data?.order) {
					// Redirect to Stripe payment page
					router.push(`/${storeId}/recharge/${result.data.order.id}/stripe`);
				}
			} catch (error) {
				toastError({
					description:
						error instanceof Error ? error.message : "Failed to create recharge order",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[storeId, minPurchase, maxPurchase, currency, router],
	);

	// Preset amounts (common values)
	const presetAmounts = [100, 500, 1000, 2000, 5000].filter((amount) => {
		if (minPurchase > 0 && amount < minPurchase) return false;
		if (maxPurchase > 0 && amount > maxPurchase) return false;
		return true;
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>{t("credit_recharge")}</CardTitle>
				<CardDescription>
					{t("credit_recharge_description")}
					{minPurchase > 0 && (
						<span className="block mt-1">
							{t("credit_min_purchase")}: {minPurchase} {currency}
						</span>
					)}
					{maxPurchase > 0 && (
						<span className="block">
							{t("credit_max_purchase")}: {maxPurchase} {currency}
						</span>
					)}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
						{presetAmounts.length > 0 && (
							<div className="space-y-2">
								<FormLabel>{t("credit_quick_select")}</FormLabel>
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
									{presetAmounts.map((amount) => (
										<Button
											key={amount}
											type="button"
											variant="outline"
											onClick={() => form.setValue("amount", amount)}
											className="h-10 min-h-[44px] sm:h-9 sm:min-h-0"
										>
											{amount} {currency}
										</Button>
									))}
								</div>
							</div>
						)}

						<FormField
							control={form.control}
							name="amount"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										{t("credit_recharge_amount")} <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input
											type="number"
											placeholder={`Enter amount (${currency})`}
											className="h-10 min-h-[44px] text-base sm:text-sm"
											{...field}
											onChange={(e) => {
												const value = e.target.value;
												field.onChange(value === "" ? "" : Number(value));
											}}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							disabled={isSubmitting}
							className="w-full h-10 min-h-[44px] sm:h-9 sm:min-h-0"
						>
							{isSubmitting ? t("credit_processing") : t("credit_continue_to_payment")}
						</Button>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}


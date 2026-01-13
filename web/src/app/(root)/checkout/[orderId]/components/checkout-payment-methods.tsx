"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { StorePaymentMethodMapping } from "@/types";

interface CheckoutPaymentMethodsProps {
	orderId: string;
	paymentMethods: (StorePaymentMethodMapping & { disabled?: boolean })[];
	returnUrl?: string;
}

export function CheckoutPaymentMethods({
	orderId,
	paymentMethods,
	returnUrl,
}: CheckoutPaymentMethodsProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	// Find first enabled payment method for initial selection
	const firstEnabledMethod = paymentMethods.find((m) => !m.disabled);
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
		string | null
	>(firstEnabledMethod?.methodId || null);
	const [isProcessing, setIsProcessing] = useState(false);

	const handlePaymentMethodChange = (value: string) => {
		// Don't allow selection of disabled payment methods
		const selectedMethod = paymentMethods.find((m) => m.methodId === value);
		if (selectedMethod && !selectedMethod.disabled) {
			setSelectedPaymentMethodId(value);
		}
	};

	const handleContinueToPayment = () => {
		if (!selectedPaymentMethodId) {
			return;
		}

		const selectedMethod = paymentMethods.find(
			(mapping) => mapping.methodId === selectedPaymentMethodId,
		);

		if (!selectedMethod) {
			return;
		}

		setIsProcessing(true);

		// Get payUrl from payment method
		const payUrl = selectedMethod.PaymentMethod.payUrl;

		// Redirect to payment page using standard /checkout/[orderId]/[payUrl] pattern
		let paymentUrl = `/checkout/${orderId}/${payUrl}`;
		if (returnUrl) {
			paymentUrl += `?returnUrl=${encodeURIComponent(returnUrl)}`;
		}
		router.push(paymentUrl);
	};

	if (paymentMethods.length === 0) {
		return (
			<Card className="mt-4">
				<CardContent className="p-4">
					<div className="text-sm text-muted-foreground">
						{t("checkout_no_payment_methods") || "No payment methods available"}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>
					{t("checkout_payment_method") || "Payment Method"}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<RadioGroup
					value={selectedPaymentMethodId || undefined}
					onValueChange={handlePaymentMethodChange}
					className="space-y-3"
				>
					{paymentMethods.map((mapping) => (
						<div key={mapping.methodId} className="flex items-center space-x-2">
							<RadioGroupItem
								value={mapping.methodId}
								id={mapping.methodId}
								disabled={mapping.disabled}
							/>
							<Label
								htmlFor={mapping.methodId}
								className={cn(
									"font-normal",
									mapping.disabled
										? "cursor-not-allowed opacity-50"
										: "cursor-pointer",
								)}
							>
								{mapping.paymentDisplayName !== null &&
								mapping.paymentDisplayName !== ""
									? mapping.paymentDisplayName
									: mapping.PaymentMethod.name}
							</Label>
						</div>
					))}
				</RadioGroup>
			</CardContent>
			<CardFooter>
				<div className="flex w-full gap-2">
					<Button
						type="button"
						onClick={handleContinueToPayment}
						disabled={!selectedPaymentMethodId || isProcessing}
						className="flex-1 h-10 sm:h-9"
					>
						{isProcessing
							? t("checkout_processing") || "Processing..."
							: t("continue_to_payment") || "Continue to Payment"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.back()}
						disabled={isProcessing}
						className="h-10 sm:h-9"
					>
						{t("checkout_cancel") || "Cancel"}
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

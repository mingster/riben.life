"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
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
import { useI18n } from "@/providers/i18n-provider";
import type { StorePaymentMethodMapping } from "@/types";

interface CheckoutPaymentMethodsProps {
	orderId: string;
	paymentMethods: (StorePaymentMethodMapping & { disabled?: boolean })[];
	returnUrl?: string;
	cancelUrl: string;
}

export function CheckoutPaymentMethods({
	orderId,
	paymentMethods,
	returnUrl,
	cancelUrl,
}: CheckoutPaymentMethodsProps) {
	const router = useRouter();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const firstEnabledMethod = paymentMethods.find((m) => !m.disabled);
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
		string | null
	>(firstEnabledMethod?.methodId || null);
	const [isProcessing, setIsProcessing] = useState(false);

	const handlePaymentMethodChange = (value: string) => {
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

		const payUrl = selectedMethod.PaymentMethod.payUrl;

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
						{t("checkout_no_payment_methods")}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle>{t("checkout_payment_method")}</CardTitle>
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
						className="h-10 flex-1 touch-manipulation sm:h-9 sm:min-h-0"
					>
						{isProcessing ? t("checkout_processing") : t("continue_to_payment")}
					</Button>
					<Button
						type="button"
						variant="outline"
						asChild
						disabled={isProcessing}
						className="h-10 touch-manipulation sm:h-9 sm:min-h-0"
					>
						<Link href={cancelUrl}>{t("checkout_cancel")}</Link>
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

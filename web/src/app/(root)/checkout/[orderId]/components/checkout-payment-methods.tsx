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

export interface CheckoutPaymentMethodItem {
	id: string;
	payUrl: string;
	name: string;
	disabled?: boolean;
}

interface CheckoutPaymentMethodsProps {
	orderId: string;
	paymentMethods: CheckoutPaymentMethodItem[];
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
	>(firstEnabledMethod?.id || null);
	const [isProcessing, setIsProcessing] = useState(false);

	const handlePaymentMethodChange = (value: string) => {
		const selectedMethod = paymentMethods.find((m) => m.id === value);
		if (selectedMethod && !selectedMethod.disabled) {
			setSelectedPaymentMethodId(value);
		}
	};

	const handleContinueToPayment = () => {
		if (!selectedPaymentMethodId) {
			return;
		}

		const selectedMethod = paymentMethods.find(
			(method) => method.id === selectedPaymentMethodId,
		);

		if (!selectedMethod) {
			return;
		}

		setIsProcessing(true);

		const payUrl = selectedMethod.payUrl;

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
					{paymentMethods.map((method) => (
						<div key={method.id} className="flex items-center space-x-2">
							<RadioGroupItem
								value={method.id}
								id={method.id}
								disabled={method.disabled}
							/>
							<Label
								htmlFor={method.id}
								className={cn(
									"font-normal",
									method.disabled
										? "cursor-not-allowed opacity-50"
										: "cursor-pointer",
								)}
							>
								{method.name}
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

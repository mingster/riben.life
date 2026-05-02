"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef } from "react";
import { useTimer } from "react-timer-hook";
import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import { useI18n } from "@/providers/i18n-provider";

type paymentProps = {
	orderId: string;
};

const REDIRECT_DELAY_SECONDS = 3;

export const CancelAndRedirect: React.FC<paymentProps> = ({ orderId }) => {
	const expiryTimestamp = useMemo(
		() => new Date(Date.now() + REDIRECT_DELAY_SECONDS * 1000),
		[],
	);

	return <MyTimer expiryTimestamp={expiryTimestamp} orderId={orderId} />;
};

function MyTimer({
	expiryTimestamp,
	orderId,
}: {
	expiryTimestamp: Date;
	orderId: string;
}) {
	const router = useRouter();
	const didNavigateRef = useRef(false);

	useTimer({
		expiryTimestamp,
		onExpire: () => {
			if (didNavigateRef.current) return;
			didNavigateRef.current = true;
			router.push(`/account/orders/${orderId}`);
		},
	});

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	if (!orderId) {
		return null;
	}

	return (
		<div className="pt-10">
			<Heading
				title={t("checkout_linepay_cancel_title")}
				description={t("checkout_linepay_cancel_descr")}
			/>
		</div>
	);
}

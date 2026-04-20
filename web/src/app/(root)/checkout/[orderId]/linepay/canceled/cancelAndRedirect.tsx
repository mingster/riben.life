"use client";

import { useRouter } from "next/navigation";
import { useTimer } from "react-timer-hook";
import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import logger from "@/lib/logger";
import { useI18n } from "@/providers/i18n-provider";
import { getUtcNow } from "@/utils/datetime-utils";

type paymentProps = {
	orderId: string;
};

export const CancelAndRedirect: React.FC<paymentProps> = ({ orderId }) => {
	const seconds = 3;
	const timeStamp = new Date(getUtcNow().getTime() + seconds * 1000);

	return <MyTimer expiryTimestamp={timeStamp} orderId={orderId} />;
};

function MyTimer({
	expiryTimestamp,
	orderId,
}: {
	expiryTimestamp: Date;
	orderId: string;
}) {
	const router = useRouter();

	useTimer({
		expiryTimestamp,
		onExpire: () => {
			logger.warn("onExpire called");
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

"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTimer } from "react-timer-hook";
import logger from "@/lib/logger";

type paymentProps = {
	orderId: string;
};
// show order success prompt and then redirect the customer to view order page (購物明細)
export const SuccessAndRedirect: React.FC<paymentProps> = ({ orderId }) => {
	const seconds = 3;
	const timeStamp = new Date(Date.now() + seconds * 1000);

	return <MyTimer expiryTimestamp={timeStamp} orderId={orderId} />;
};

function MyTimer({
	expiryTimestamp,
	orderId,
}: {
	expiryTimestamp: Date;
	orderId: string;
}) {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const router = useRouter();
	//const session = useSession();

	const {
		seconds,
		minutes,
		hours,
		days,
		isRunning,
		start,
		pause,
		resume,
		restart,
	} = useTimer({
		expiryTimestamp,
		onExpire: () => {
			logger.warn("onExpire called");
			//router.reload();
			router.push("/storeAdmin");
		},
	});

	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	if (!mounted) return <></>;

	if (!orderId) {
		return "no order";
	}

	return (
		<div className="pt-10">
			<h1>{t("subscription_success_title")}</h1>
			{t("subscription_success_descr")}
		</div>
	);
}

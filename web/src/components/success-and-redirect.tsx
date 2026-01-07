"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { useTimer } from "react-timer-hook";
import logger from "@/lib/logger";
import { StoreOrder } from "@/types";
import { Suspense } from "react";
import { Loader } from "./loader";

type paymentProps = {
	order?: StoreOrder;
	orderId?: string;
	returnUrl?: string;
};

// show order success prompt and then redirect the customer to view order page (購物明細)
// or to custom returnUrl if provided
export const SuccessAndRedirect: React.FC<paymentProps> = ({
	order,
	orderId,
	returnUrl,
}) => {
	const seconds = 3;
	const timeStamp = new Date(Date.now() + seconds * 1000);

	// Use order.id if order is provided, otherwise fall back to orderId
	const finalOrderId = order?.id || orderId;

	if (!finalOrderId) {
		return <div>No order ID provided</div>;
	}

	return (
		<MyTimer
			expiryTimestamp={timeStamp}
			order={order}
			orderId={finalOrderId}
			returnUrl={returnUrl}
		/>
	);
};

function MyTimer({
	expiryTimestamp,
	order,
	orderId,
	returnUrl,
}: {
	expiryTimestamp: Date;
	order?: StoreOrder;
	orderId: string;
	returnUrl?: string;
}) {
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

			// Redirect to custom returnUrl if provided, otherwise default to order page
			if (returnUrl) {
				router.push(returnUrl);
			} else {
				router.push(`/order/${orderId}`);
			}

			/*
	  if (!session.data?.user) {
		router.push(`/order/${orderId}`);
	  } else {
		router.push(
		  `/account/?ordertab=${OrderStatus[OrderStatus.Processing]}`,
		);
	  }*/
		},
	});

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	if (!orderId) {
		return "no order";
	}

	return (
		<Suspense fallback={<Loader />}>
			<div className="container relative pb-10">
				<section className="mx-auto flex max-w-[980px] flex-col items-center gap-2 py-8 md:py-12 md:pb-8 lg:py-24 lg:pb-6">
					<h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
						{t("success_title")}
					</h2>
					<p className="text-center text-lg text-muted-foreground">
						{t("order_success_descr")}
					</p>
				</section>
				<div className="relative flex w-full justify-center"> </div>
			</div>
		</Suspense>
	);
}

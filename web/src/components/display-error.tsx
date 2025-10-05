"use client";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { useTimer } from "react-timer-hook";

type displayErrorProps = {
	callbackUrl: string;
	error: string;
};

// display error message then redirect to callbackUrl in 3 seconds
export default function DisplayError({
	callbackUrl,
	error,
}: displayErrorProps) {
	const seconds = 3;
	const timeStamp = new Date(Date.now() + seconds * 1000);

	return (
		<MyTimer
			expiryTimestamp={timeStamp}
			error={error}
			callbackUrl={callbackUrl}
		/>
	);
}

function MyTimer({
	expiryTimestamp,
	error,
	callbackUrl,
}: {
	expiryTimestamp: Date;
	error: string;
	callbackUrl: string;
}) {
	const router = useRouter();

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
			//console.warn("onExpire called");
			router.push(callbackUrl);
		},
	});

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<div className="pt-10">
			<h1>{t("error_title")}</h1>
			<p>{error}</p>
		</div>
	);
}

"use client";

import liff from "@line/liff";
import { useCallback } from "react";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { WaitlistJoinClient } from "@/app/s/[storeId]/waitlist/components/waitlist-join-client";
import type { ComponentProps } from "react";

type LiffWaitlistJoinClientProps = Omit<
	ComponentProps<typeof WaitlistJoinClient>,
	"postQueueSecondaryAction"
>;

/**
 * LIFF waitlist UI: same behavior as the public store waitlist, with LIFF-specific CTAs.
 */
export function LiffWaitlistJoinClient(props: LiffWaitlistJoinClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const handleCalledInLiff = useCallback(
		async ({ queueNumber }: { queueNumber: number }) => {
			try {
				if (!liff.isInClient() || !liff.isLoggedIn()) {
					return;
				}
				await liff.sendMessages([
					{
						type: "text",
						text: `${t("waitlist_status_called")} #${queueNumber}\n${t("waitlist_status_called_message")}`,
					},
				]);
			} catch {
				// Non-fatal: queue status is already updated.
			}
		},
		[t],
	);

	return (
		<WaitlistJoinClient
			{...props}
			postQueueSecondaryAction={{
				href: `/liff/${props.storeId}`,
				labelKey: "liff_waitlist_back_to_store",
			}}
			onCalled={handleCalledInLiff}
		/>
	);
}

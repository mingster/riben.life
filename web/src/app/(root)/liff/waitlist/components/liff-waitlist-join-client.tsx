"use client";

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
	return (
		<WaitlistJoinClient
			{...props}
			postQueueSecondaryAction={{
				href: `/liff/${props.storeId}`,
				labelKey: "liff_waitlist_back_to_store",
			}}
		/>
	);
}

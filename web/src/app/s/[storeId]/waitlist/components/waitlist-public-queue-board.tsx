"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
	listWaitlistPublicQueueAction,
	type PublicWaitlistQueueEntry,
} from "@/actions/store/waitlist/list-waitlist-public-queue";
import { useTranslation } from "@/app/i18n/client";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/providers/i18n-provider";
import { WaitListStatus } from "@/types/waitlist-status";
import { cn } from "@/lib/utils";
import type { WaitlistSessionBlock } from "@/lib/waitlist/session";

interface Props {
	storeId: string;
	sessionBlock: WaitlistSessionBlock;
	showQueue: boolean;
	waitlistId?: string;
	verificationCode?: string;
	sessionBlockLabel: string;
}

export function WaitlistPublicQueueBoard({
	storeId,
	sessionBlock,
	showQueue,
	waitlistId,
	verificationCode,
	sessionBlockLabel,
}: Props) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [entries, setEntries] = useState<PublicWaitlistQueueEntry[]>([]);
	const [loading, setLoading] = useState(false);
	const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const refresh = useCallback(async () => {
		if (!showQueue) {
			setEntries([]);
			return;
		}
		setLoading(true);
		try {
			const result = await listWaitlistPublicQueueAction({
				storeId,
				sessionBlock,
				waitlistId,
				verificationCode,
			});
			if (result?.serverError) {
				return;
			}
			setEntries(result?.data?.entries ?? []);
		} finally {
			setLoading(false);
		}
	}, [showQueue, storeId, sessionBlock, waitlistId, verificationCode]);

	useEffect(() => {
		if (!showQueue) {
			setEntries([]);
			return;
		}
		void refresh();
		pollRef.current = setInterval(() => void refresh(), 12_000);
		return () => {
			if (pollRef.current) {
				clearInterval(pollRef.current);
			}
		};
	}, [showQueue, refresh]);

	if (!showQueue) {
		return null;
	}

	return (
		<div className="space-y-2 rounded-lg border bg-muted/30 p-4">
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium">
					{t("waitlist_public_queue_title")}
				</p>
				<span className="text-muted-foreground text-xs">
					{sessionBlockLabel}
				</span>
			</div>
			<p className="text-muted-foreground text-xs">
				{t("waitlist_public_queue_privacy_note")}
			</p>
			{entries.length === 0 ? (
				<p className="text-muted-foreground py-2 text-center text-sm">
					{loading
						? t("waitlist_public_queue_loading")
						: t("waitlist_public_queue_empty")}
				</p>
			) : (
				<ul className="divide-y rounded-md border bg-background/80">
					{entries.map((entry) => (
						<li
							key={entry.queueNumber}
							className={cn(
								"flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm",
								entry.isYou && "bg-primary/5",
							)}
						>
							<div className="flex min-w-0 flex-1 items-center gap-2">
								<span className="font-mono font-semibold tabular-nums">
									#{entry.queueNumber}
								</span>
								<span className="truncate text-muted-foreground">
									{entry.maskedName || t("waitlist_queue_masked_guest")}
								</span>
								<span className="text-muted-foreground text-xs">
									{t("waitlist_party_adults")}: {entry.numOfAdult}
									{entry.numOfChild > 0
										? ` · ${t("waitlist_party_children")}: ${entry.numOfChild}`
										: ""}
								</span>
							</div>
							<div className="flex shrink-0 items-center gap-1.5">
								{entry.isYou ? (
									<Badge variant="outline" className="text-xs">
										{t("waitlist_public_queue_you")}
									</Badge>
								) : null}
								<Badge
									variant={
										entry.status === WaitListStatus.called
											? "default"
											: "secondary"
									}
									className="text-xs"
								>
									{entry.status === WaitListStatus.called
										? t("waitlist_status_called")
										: t("waitlist_status_waiting")}
								</Badge>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

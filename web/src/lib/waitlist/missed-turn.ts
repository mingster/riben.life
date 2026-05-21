import type { WaitlistSessionBlock } from "@/lib/waitlist/session";

/** Elapsed ms since staff called this entry. */
export function getMsSinceCalled(
	notifiedAt: bigint | null,
	now: bigint,
): bigint {
	if (notifiedAt == null) {
		return BigInt(0);
	}
	const elapsed = now - notifiedAt;
	return elapsed > BigInt(0) ? elapsed : BigInt(0);
}

export function isMissedTurnEligible(params: {
	status: string;
	notifiedAt: bigint | null;
	missedTurnEnabled: boolean;
	missedTurnMinutesAfterCall: number;
	now: bigint;
}): boolean {
	const {
		status,
		notifiedAt,
		missedTurnEnabled,
		missedTurnMinutesAfterCall,
		now,
	} = params;
	if (!missedTurnEnabled || status !== "called" || notifiedAt == null) {
		return false;
	}
	const thresholdMs =
		BigInt(Math.max(0, missedTurnMinutesAfterCall)) * BigInt(60_000);
	return getMsSinceCalled(notifiedAt, now) >= thresholdMs;
}

/**
 * Position N from top of waiting queue (1-based). Returns target queueNumber and
 * list of waiting ids that must increment by 1 (those at or after target).
 */
export function computeRequeueQueueNumber(params: {
	waitingQueueNumbers: number[];
	positionFromTop: number;
}): { targetQueueNumber: number; bumpFromQueueNumber: number } {
	const { waitingQueueNumbers } = params;
	const position = Math.max(1, Math.floor(params.positionFromTop));
	const sorted = [...waitingQueueNumbers].sort((a, b) => a - b);

	let targetQueueNumber: number;
	if (sorted.length === 0) {
		targetQueueNumber = 1;
	} else if (position <= sorted.length) {
		targetQueueNumber = sorted[position - 1];
	} else {
		targetQueueNumber = sorted[sorted.length - 1] + 1;
	}

	return {
		targetQueueNumber,
		bumpFromQueueNumber: targetQueueNumber,
	};
}

export type WaitlistEntryScope = {
	storeId: string;
	sessionBlock: WaitlistSessionBlock;
	dayStartEpoch: bigint;
	dayEndEpoch: bigint;
};

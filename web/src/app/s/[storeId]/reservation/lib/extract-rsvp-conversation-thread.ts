import type { Rsvp } from "@/types";

/** One row in the RSVP notes message thread (customer / store / system). */
export interface RsvpConversationThreadItem {
	id: string;
	senderType: string;
	message: string;
	createdAtMs: number;
}

export function conversationMessageTimeMs(createdAt: unknown): number {
	if (createdAt == null) {
		return 0;
	}
	if (typeof createdAt === "bigint") {
		return Number(createdAt);
	}
	if (typeof createdAt === "number") {
		return createdAt;
	}
	return 0;
}

/**
 * Flattens Prisma `Rsvp.RsvpConversation.Messages` into a sorted, display-ready list.
 */
export function extractRsvpConversationThread(
	rsvp: Rsvp | undefined,
): RsvpConversationThreadItem[] {
	const messages = (
		rsvp as unknown as {
			RsvpConversation?: {
				Messages?: Array<{
					id: string;
					senderType: string;
					message: string;
					createdAt?: unknown;
					deletedAt?: unknown;
				}>;
			} | null;
		}
	)?.RsvpConversation?.Messages;

	if (!messages?.length) {
		return [];
	}

	return messages
		.filter((m) => m && m.deletedAt == null)
		.map((m) => ({
			id: m.id,
			senderType: m.senderType,
			message: m.message,
			createdAtMs: conversationMessageTimeMs(m.createdAt),
		}))
		.sort((a, b) => a.createdAtMs - b.createdAtMs);
}

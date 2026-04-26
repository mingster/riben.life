interface RsvpConversationMessageRecord {
	message?: string | null;
}

interface RsvpConversationRecord {
	Messages?: RsvpConversationMessageRecord[] | null;
}

interface RsvpMessageLike {
	message?: string | null;
	RsvpConversation?: RsvpConversationRecord | null;
}

export function getRsvpConversationMessage(rsvp: unknown): string | null {
	const reservation = rsvp as RsvpMessageLike;

	const legacyMessage = reservation.message?.trim();
	if (legacyMessage) {
		return legacyMessage;
	}

	const firstConversationMessage =
		reservation.RsvpConversation?.Messages?.[0]?.message?.trim();

	return firstConversationMessage || null;
}

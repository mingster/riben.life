import { sqlClient } from "@/lib/prismadb";

/**
 * Removes all RSVP rows and store-level RSVP tags/blacklist.
 * Deletes conversation/messages and 1:1 side tables first so a corrupt DB (e.g. duplicate
 * `rsvpId` rows where the schema expects one) does not make Prisma throw
 * "Expected zero or one element" on `Rsvp.deleteMany`.
 */
export interface DeleteAllRsvpDataCoreResult {
	rsvpConversationMessageCount: number;
	rsvpConversationCount: number;
	rsvpCustomerConfirmSentCount: number;
	rsvpReminderSentCount: number;
	rsvpTagCount: number;
	rsvpBlacklistCount: number;
	rsvpCount: number;
}

export async function deleteAllRsvpDataCore(): Promise<DeleteAllRsvpDataCoreResult> {
	const rsvpConversationMessageCount =
		await sqlClient.rsvpConversationMessage.deleteMany({
			where: {},
		});
	const rsvpConversationCount = await sqlClient.rsvpConversation.deleteMany({
		where: {},
	});
	const rsvpCustomerConfirmSentCount =
		await sqlClient.rsvpCustomerConfirmSent.deleteMany({
			where: {},
		});
	const rsvpReminderSentCount = await sqlClient.rsvpReminderSent.deleteMany({
		where: {},
	});
	const rsvpTagCount = await sqlClient.rsvpTag.deleteMany({
		where: {},
	});
	const rsvpBlacklistCount = await sqlClient.rsvpBlacklist.deleteMany({
		where: {},
	});
	const rsvpCount = await sqlClient.rsvp.deleteMany({
		where: {},
	});

	return {
		rsvpConversationMessageCount: rsvpConversationMessageCount.count,
		rsvpConversationCount: rsvpConversationCount.count,
		rsvpCustomerConfirmSentCount: rsvpCustomerConfirmSentCount.count,
		rsvpReminderSentCount: rsvpReminderSentCount.count,
		rsvpTagCount: rsvpTagCount.count,
		rsvpBlacklistCount: rsvpBlacklistCount.count,
		rsvpCount: rsvpCount.count,
	};
}

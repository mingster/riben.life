import { authClient } from "@/lib/auth-client";
import { sqlClient } from "@/lib/prismadb";

/**
 * Deletes Prisma-bound user data and removes the user via Better Auth (same sequence as single-user delete).
 */
export async function removeUserDataAndAuth(params: {
	userId: string;
	userEmail: string;
}): Promise<void> {
	const { userId, userEmail } = params;

	await sqlClient.apikey.deleteMany({
		where: { userId },
	});

	await sqlClient.passkey.deleteMany({
		where: { userId },
	});

	await sqlClient.session.deleteMany({
		where: { userId },
	});

	await sqlClient.account.deleteMany({
		where: { userId },
	});

	await sqlClient.twoFactor.deleteMany({
		where: { userId },
	});

	await sqlClient.subscription.deleteMany({
		where: { referenceId: userId },
	});

	await sqlClient.invitation.deleteMany({
		where: { email: userEmail },
	});

	await sqlClient.member.deleteMany({
		where: { userId },
	});

	await sqlClient.serviceStaff.deleteMany({
		where: { userId },
	});

	await sqlClient.customerCredit.deleteMany({
		where: { userId },
	});

	await sqlClient.customerCreditLedger.deleteMany({
		where: { userId },
	});

	await sqlClient.customerFiatLedger.deleteMany({
		where: { userId },
	});

	await sqlClient.address.deleteMany({
		where: { userId },
	});

	await sqlClient.customerInvite.deleteMany({
		where: {
			OR: [{ userId }, { invitedBy: userId }],
		},
	});

	await sqlClient.notificationPreferences.deleteMany({
		where: { userId },
	});

	await sqlClient.messageQueue.deleteMany({
		where: {
			OR: [{ senderId: userId }, { recipientId: userId }],
		},
	});

	await sqlClient.supportTicket.deleteMany({
		where: {
			OR: [{ senderId: userId }, { recipientId: userId }],
		},
	});

	await sqlClient.storeOrder.deleteMany({
		where: { userId },
	});

	await authClient.admin.removeUser({
		userId,
	});
}

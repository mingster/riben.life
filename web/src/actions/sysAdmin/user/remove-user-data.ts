import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { headers } from "next/headers";

/**
 * Deletes Prisma-bound user data, then calls Better Auth `removeUser` with the current request headers
 * (server `authClient` has no session cookies, so the `user` row was left behind before this fix).
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

	try {
		const removeResult = await auth.api.removeUser({
			body: { userId },
			headers: await headers(),
		});

		if (!removeResult.success) {
			logger.error("Better Auth removeUser did not complete", {
				metadata: { userId, removeResult },
				tags: ["sysAdmin", "user-delete", "better-auth"],
			});
			throw new Error("Failed to remove user account");
		}
	} catch (err) {
		const code =
			err != null &&
			typeof err === "object" &&
			"body" in err &&
			err.body != null &&
			typeof err.body === "object" &&
			"code" in err.body
				? (err.body as { code?: string }).code
				: undefined;

		if (code === "USER_NOT_FOUND") {
			// Auth data was already stripped (e.g. by a previous partial run).
			// The user row may be orphaned — deleteMany is a no-op if already gone.
			await sqlClient.user.deleteMany({ where: { id: userId } });
		} else {
			throw err;
		}
	}
}

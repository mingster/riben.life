"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { adminActionClient } from "@/utils/actions/safe-action";
import { deleteUserSchema } from "./delete-user.validation";
import logger from "@/lib/logger";
import { authClient } from "@/lib/auth-client";

export const deleteUserAction = adminActionClient
	.metadata({ name: "deleteUser" })
	.schema(deleteUserSchema)
	.action(async ({ parsedInput }) => {
		const { userEmail } = parsedInput;

		logger.info("Deleting user", {
			metadata: { userEmail },
			tags: ["api", "sysAdmin", "user-delete"],
		});

		// Find user by email
		const user = await sqlClient.user.findUnique({
			where: {
				email: userEmail,
			},
		});

		if (!user) {
			throw new SafeError("User not found");
		}

		// Delete all data related to the user
		// Delete all api keys
		await sqlClient.apikey.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all passkeys
		await sqlClient.passkey.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all sessions
		await sqlClient.session.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all accounts
		await sqlClient.account.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all twofactors
		await sqlClient.twoFactor.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all subscriptions of the user
		await sqlClient.subscription.deleteMany({
			where: {
				referenceId: user.id,
			},
		});

		// Delete all invitations of the user
		await sqlClient.invitation.deleteMany({
			where: {
				email: user.email as string,
			},
		});

		// Delete all members of the user
		await sqlClient.member.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all service staff records
		await sqlClient.serviceStaff.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all customer credits
		await sqlClient.customerCredit.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all customer credit ledgers
		await sqlClient.customerCreditLedger.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all customer fiat ledgers
		await sqlClient.customerFiatLedger.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all addresses
		await sqlClient.address.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all customer invites (both as invitee and inviter)
		await sqlClient.customerInvite.deleteMany({
			where: {
				OR: [{ userId: user.id }, { invitedBy: user.id }],
			},
		});

		// Delete all notification preferences
		await sqlClient.notificationPreferences.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Delete all message queues (as sender or recipient)
		await sqlClient.messageQueue.deleteMany({
			where: {
				OR: [{ senderId: user.id }, { recipientId: user.id }],
			},
		});

		// Delete all support tickets (as sender or recipient)
		await sqlClient.supportTicket.deleteMany({
			where: {
				OR: [{ senderId: user.id }, { recipientId: user.id }],
			},
		});

		// Delete all store orders
		await sqlClient.storeOrder.deleteMany({
			where: {
				userId: user.id,
			},
		});

		// Remove user from Better Auth
		await authClient.admin.removeUser({
			userId: user.id,
		});

		logger.info("User deleted successfully", {
			metadata: { userId: user.id, userEmail },
			tags: ["api", "sysAdmin", "user-delete"],
		});

		return {
			success: true,
			message: "user deleted",
			userId: user.id,
		};
	});

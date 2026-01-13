import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";

/**
 * Links an anonymous user account to a newly registered/authenticated user account.
 * Migrates all data from the anonymous user to the new user within a transaction.
 *
 * This function is called by Better Auth's anonymous plugin when an anonymous user
 * signs up or signs in, transferring all their data (reservations, orders, credit, etc.)
 * to their new account.
 *
 * @param anonymousUserId - The ID of the anonymous/guest user account
 * @param newUserId - The ID of the newly registered/authenticated user account
 */
export async function linkAnonymousAccount(
	anonymousUserId: string,
	newUserId: string,
): Promise<void> {
	try {
		console.log("linkAnonymousAccount", anonymousUserId, newUserId);

		await sqlClient.$transaction(async (tx) => {
			// Get new user's information for updating RSVP fields
			const newUser = await tx.user.findUnique({
				where: {
					id: newUserId,
				},
				select: {
					name: true,
					phoneNumber: true,
				},
			});

			// 1. Update Reservations (Rsvp)
			// Update customerId, name, phone, and createdBy fields
			const rsvpUpdateResult = await tx.rsvp.updateMany({
				where: {
					customerId: anonymousUserId,
				},
				data: {
					customerId: newUserId,
					// Update name and phone from new user's profile
					...(newUser?.name && { name: newUser.name }),
					...(newUser?.phoneNumber && { phone: newUser.phoneNumber }),
					// Update createdBy to new user's ID
					createdBy: newUserId,
				},
			});

			// 2. Update Store Orders
			const orderUpdateResult = await tx.storeOrder.updateMany({
				where: {
					userId: anonymousUserId,
				},
				data: {
					userId: newUserId,
				},
			});

			// 3. Merge Customer Credit accounts
			const anonymousCredit = await tx.customerCredit.findUnique({
				where: {
					userId: anonymousUserId,
				},
			});

			let creditTransferred = null;
			if (anonymousCredit) {
				const anonymousPoint = Number(anonymousCredit.point);
				const anonymousFiat = Number(anonymousCredit.fiat);

				// Transfer credit to new user's account (create if doesn't exist, increment if exists)
				await tx.customerCredit.upsert({
					where: {
						userId: newUserId,
					},
					create: {
						userId: newUserId,
						point: new Prisma.Decimal(anonymousPoint),
						fiat: new Prisma.Decimal(anonymousFiat),
						updatedAt: getUtcNowEpoch(),
					},
					update: {
						point: {
							increment: anonymousPoint,
						},
						fiat: {
							increment: anonymousFiat,
						},
						updatedAt: getUtcNowEpoch(),
					},
				});

				// Delete anonymous user's credit account after transfer
				await tx.customerCredit.delete({
					where: {
						userId: anonymousUserId,
					},
				});

				creditTransferred = {
					point: anonymousPoint,
					fiat: anonymousFiat,
				};
			}

			// 4. Update Credit Ledgers (CustomerCreditLedger, CustomerFiatLedger)
			// Update userId for ledger entries owned by anonymous user
			await tx.customerCreditLedger.updateMany({
				where: {
					userId: anonymousUserId,
				},
				data: {
					userId: newUserId,
				},
			});

			await tx.customerFiatLedger.updateMany({
				where: {
					userId: anonymousUserId,
				},
				data: {
					userId: newUserId,
				},
			});

			// Update creatorId for ledger entries created by anonymous user
			await tx.customerCreditLedger.updateMany({
				where: {
					creatorId: anonymousUserId,
				},
				data: {
					creatorId: newUserId,
				},
			});

			await tx.customerFiatLedger.updateMany({
				where: {
					creatorId: anonymousUserId,
				},
				data: {
					creatorId: newUserId,
				},
			});

			// 5. Update Addresses
			const addressUpdateResult = await tx.address.updateMany({
				where: {
					userId: anonymousUserId,
				},
				data: {
					userId: newUserId,
				},
			});

			// 6. Update Store Memberships (Member)
			const memberUpdateResult = await tx.member.updateMany({
				where: {
					userId: anonymousUserId,
				},
				data: {
					userId: newUserId,
				},
			});

			// 7. Update MessageQueue records (as sender or recipient)
			// Update records where anonymous user is the sender
			const messageQueueSenderUpdateResult = await tx.messageQueue.updateMany({
				where: {
					senderId: anonymousUserId,
				},
				data: {
					senderId: newUserId,
				},
			});

			// Update records where anonymous user is the recipient
			const messageQueueRecipientUpdateResult =
				await tx.messageQueue.updateMany({
					where: {
						recipientId: anonymousUserId,
					},
					data: {
						recipientId: newUserId,
					},
				});
			logger.info("Account linking completed", {
				metadata: {
					anonymousUserId,
					newUserId,
					recordsMigrated: {
						rsvps: rsvpUpdateResult.count,
						orders: orderUpdateResult.count,
						addresses: addressUpdateResult.count,
						members: memberUpdateResult.count,
						messageQueuesAsSender: messageQueueSenderUpdateResult.count,
						messageQueuesAsRecipient: messageQueueRecipientUpdateResult.count,
						creditTransferred,
					},
				},
				tags: ["auth", "anonymous", "account-linking"],
			});
		});
	} catch (error) {
		logger.error("Account linking failed", {
			metadata: {
				anonymousUserId,
				newUserId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			},
			tags: ["auth", "anonymous", "account-linking", "error"],
		});
		// Re-throw error to prevent account linking from succeeding if migration fails
		throw error;
	}
}

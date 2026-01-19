import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { getUtcNowEpoch, getUtcNow } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import { MemberRole } from "@/types/enum";
import crypto from "crypto";

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

			// Get all RSVPs for the anonymous user to extract name if available
			const anonymousRsvps = await tx.rsvp.findMany({
				where: {
					customerId: anonymousUserId,
				},
				select: {
					name: true,
					phone: true,
					createdAt: true,
				},
				orderBy: {
					createdAt: "desc", // Get most recent first
				},
			});

			// Use name from RSVP if available and newUser doesn't have a name
			// Prioritize the most recent RSVP's name
			if (!newUser?.name && anonymousRsvps.length > 0) {
				const rsvpWithName = anonymousRsvps.find((rsvp) => rsvp.name);
				if (rsvpWithName?.name) {
					// Update new user's name using the name from RSVP
					await tx.user.update({
						where: { id: newUserId },
						data: { name: rsvpWithName.name },
					});
				}
			}

			// 1. Update Reservations (Rsvp)
			// Update customerId, phone (use validated phoneNumber if different), and createdBy fields
			// Keep RSVP names as-is (they were entered during reservation)
			// Update RSVP phone to use validated phoneNumber from newUser if available and different
			const rsvpUpdateData: {
				customerId: string;
				createdBy: string;
				phone?: string;
			} = {
				customerId: newUserId,
				createdBy: newUserId,
			};

			// Update phone: use validated phoneNumber from newUser if available
			// This ensures RSVPs use the validated phone number from the user's profile
			if (newUser?.phoneNumber) {
				rsvpUpdateData.phone = newUser.phoneNumber;
			}

			const rsvpUpdateResult = await tx.rsvp.updateMany({
				where: {
					customerId: anonymousUserId,
				},
				data: rsvpUpdateData,
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
			// Update existing memberships that were created with anonymousUserId
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

			// 8. Add customer as store member for orders they placed
			// Find all orders that belong to the new user (which were just updated from anonymousUserId)
			// Get unique storeIds from those orders
			// For each store, add the user as a member of the store's organization with "customer" role
			const orders = await tx.storeOrder.findMany({
				where: {
					userId: newUserId,
				},
				select: {
					storeId: true,
				},
			});

			let membersCreated = 0;
			if (orders.length > 0) {
				// Get unique storeIds from orders using Set
				const uniqueStoreIds = [
					...new Set(orders.map((order) => order.storeId)),
				];

				// Get stores with their organizationIds
				const stores = await tx.store.findMany({
					where: {
						id: {
							in: uniqueStoreIds,
						},
					},
					select: {
						id: true,
						organizationId: true,
					},
				});

				// For each store with an organization, check if user is already a member
				// If not, create a Member record with "customer" role
				for (const store of stores) {
					if (!store.organizationId) {
						// Store doesn't have an organization, skip
						continue;
					}

					// Check if user is already a member of this organization
					// (This includes memberships that were just updated in Step 6)
					const existingMember = await tx.member.findFirst({
						where: {
							userId: newUserId,
							organizationId: store.organizationId,
						},
					});

					if (!existingMember) {
						// User is not a member yet, create a new member record with "customer" role
						await tx.member.create({
							data: {
								id: crypto.randomUUID(),
								userId: newUserId,
								organizationId: store.organizationId,
								role: MemberRole.customer,
								createdAt: getUtcNow(),
							},
						});
						membersCreated++;
					}
				}
			}

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
						membersCreatedForOrders: membersCreated,
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

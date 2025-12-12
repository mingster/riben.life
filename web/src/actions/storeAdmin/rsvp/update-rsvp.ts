"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { Rsvp } from "@/types";
import { RsvpStatus } from "@/types/enum";
import { CustomerCreditLedgerType } from "@/types/enum";
import {
	getUtcNowEpoch,
	dateToEpoch,
	convertDateToUtc,
} from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateRsvpSchema } from "./update-rsvp.validation";
import logger from "@/lib/logger";
import { getT } from "@/app/i18n";

export const updateRsvpAction = storeActionClient
	.metadata({ name: "updateRsvp" })
	.schema(updateRsvpSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			id,
			customerId,
			facilityId,
			numOfAdult,
			numOfChild,
			rsvpTime: rsvpTimeInput,
			arriveTime: arriveTimeInput,
			status,
			message,
			alreadyPaid,
			confirmedByStore,
			confirmedByCustomer,
			facilityCost,
			pricingRuleId,
		} = parsedInput;

		const rsvp = await sqlClient.rsvp.findUnique({
			where: { id },
			select: {
				id: true,
				storeId: true,
				createdBy: true,
				status: true,
				alreadyPaid: true,
				customerId: true,
			},
		});

		if (!rsvp || rsvp.storeId !== storeId) {
			throw new SafeError("Rsvp not found");
		}

		const wasCompleted = rsvp.status === RsvpStatus.Completed;

		// Get current user ID for createdBy field (only set if currently null)
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const createdBy = session?.user?.id || rsvp.createdBy || null;

		// Fetch store to get timezone and creditServiceExchangeRate
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				defaultTimezone: true,
				creditServiceExchangeRate: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";

		// Validate facility (required)
		if (!facilityId) {
			throw new SafeError("Facility is required");
		}

		const facility = await sqlClient.storeFacility.findFirst({
			where: {
				id: facilityId,
				storeId,
			},
			select: {
				id: true,
				defaultDuration: true,
			},
		});

		if (!facility) {
			throw new SafeError("Facility not found");
		}

		// Convert rsvpTime to UTC Date, then to BigInt epoch
		// The Date object from datetime-local input represents a time in the browser's local timezone
		// We need to interpret it as store timezone time and convert to UTC
		let rsvpTimeUtc: Date;
		try {
			rsvpTimeUtc = convertDateToUtc(rsvpTimeInput, storeTimezone);
		} catch (error) {
			throw new SafeError(
				error instanceof Error
					? error.message
					: "Failed to convert rsvpTime to UTC",
			);
		}

		const rsvpTime = dateToEpoch(rsvpTimeUtc);
		if (!rsvpTime) {
			throw new SafeError("Failed to convert rsvpTime to epoch");
		}

		// Convert arriveTime to UTC Date, then to BigInt epoch (or null)
		// Same conversion as rsvpTime - interpret as store timezone and convert to UTC
		const arriveTime =
			arriveTimeInput instanceof Date
				? (() => {
						try {
							const utcDate = convertDateToUtc(arriveTimeInput, storeTimezone);
							return dateToEpoch(utcDate);
						} catch {
							// Return null if conversion fails (invalid date)
							return null;
						}
					})()
				: null;

		try {
			const updated = await sqlClient.$transaction(async (tx) => {
				const updatedRsvp = await tx.rsvp.update({
					where: { id },
					data: {
						customerId: customerId || null,
						facilityId,
						numOfAdult,
						numOfChild,
						rsvpTime,
						arriveTime: arriveTime || null,
						status,
						message: message || null,
						alreadyPaid,
						confirmedByStore,
						confirmedByCustomer,
						facilityCost:
							facilityCost !== null && facilityCost !== undefined
								? facilityCost
								: null,
						pricingRuleId: pricingRuleId || null,
						createdBy: createdBy || undefined, // Only update if we have a value
						updatedAt: getUtcNowEpoch(),
					},
					include: {
						Store: true,
						Customer: true,
						CreatedBy: true,
						Order: true,
						Facility: true,
						FacilityPricingRule: true,
					},
				});

				// If status is Completed, not alreadyPaid, and wasn't previously Completed, deduct customer's credit
				if (
					status === RsvpStatus.Completed &&
					!alreadyPaid &&
					!wasCompleted &&
					customerId &&
					store.creditServiceExchangeRate &&
					Number(store.creditServiceExchangeRate) > 0
				) {
					// Calculate credit to deduct based on duration and creditServiceExchangeRate
					// creditPoints = duration (minutes) / creditServiceExchangeRate (minutes per point)
					// Example: duration = 60 minutes, creditServiceExchangeRate = 30 minutes/point
					// creditToDeduct = 60 / 30 = 2 points
					const duration = facility.defaultDuration || 60; // Default to 60 minutes if not set
					const creditServiceExchangeRate = Number(
						store.creditServiceExchangeRate,
					);
					const creditToDeduct = duration / creditServiceExchangeRate;

					// Update the RSVP's facilityCredit field to store the calculated credit amount
					await tx.rsvp.update({
						where: { id },
						data: {
							facilityCredit: new Prisma.Decimal(creditToDeduct),
						},
					});

					if (creditToDeduct > 0) {
						// Get current credit balance
						const existingCredit = await tx.customerCredit.findUnique({
							where: {
								storeId_userId: {
									storeId,
									userId: customerId,
								},
							},
						});

						const currentBalance = existingCredit
							? Number(existingCredit.point)
							: 0;

						if (currentBalance >= creditToDeduct) {
							const newBalance = currentBalance - creditToDeduct;

							// Update CustomerCredit
							await tx.customerCredit.upsert({
								where: {
									storeId_userId: {
										storeId,
										userId: customerId,
									},
								},
								update: {
									point: {
										decrement: creditToDeduct,
									},
									updatedAt: getUtcNowEpoch(),
								},
								create: {
									storeId,
									userId: customerId,
									point: -creditToDeduct, // Negative balance if deducting from zero
									updatedAt: getUtcNowEpoch(),
								},
							});

							// Get translation function for ledger note
							const { t } = await getT();

							// Create ledger entry for credit deduction
							await tx.customerCreditLedger.create({
								data: {
									storeId,
									userId: customerId,
									amount: new Prisma.Decimal(-creditToDeduct),
									balance: new Prisma.Decimal(newBalance),
									type: CustomerCreditLedgerType.Spend,
									referenceId: id, // Reference to RSVP
									note: t("rsvp_credit_deduction_note", {
										points: creditToDeduct,
									}),
									creatorId: createdBy || null,
									createdAt: getUtcNowEpoch(),
								},
							});

							logger.info("Customer credit deducted for completed RSVP", {
								metadata: {
									rsvpId: id,
									customerId,
									duration,
									creditServiceExchangeRate,
									creditAmount: creditToDeduct,
									balanceBefore: currentBalance,
									balanceAfter: newBalance,
								},
								tags: ["rsvp", "credit", "deduction"],
							});
						} else {
							logger.warn("Insufficient credit balance for RSVP completion", {
								metadata: {
									rsvpId: id,
									customerId,
									requiredCredit: creditToDeduct,
									currentBalance,
								},
								tags: ["rsvp", "credit", "warning"],
							});
						}
					}
				}

				return updatedRsvp;
			});

			const transformedRsvp = { ...updated } as Rsvp;
			transformPrismaDataForJson(transformedRsvp);

			return {
				rsvp: transformedRsvp,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("Rsvp update failed.");
			}

			throw error;
		}
	});

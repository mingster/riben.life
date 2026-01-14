import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNowEpoch, dateToEpoch, getUtcNow } from "@/utils/datetime-utils";
import { Prisma } from "@prisma/client";
import {
	RsvpStatus,
	MemberRole,
	StoreLedgerType,
	CustomerCreditLedgerType,
} from "@/types/enum";
import crypto from "crypto";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { getT } from "@/app/i18n";

interface ImportResult {
	success: boolean;
	totalBlocks: number;
	totalReservations: number;
	createdReservations: number;
	skippedReservations: number;
	errors: Array<{
		blockIndex: number;
		customerName: string;
		reservationNumber?: number;
		error: string;
	}>;
	warnings: Array<{
		blockIndex: number;
		customerName: string;
		message: string;
	}>;
}

export async function POST(
	req: Request,
	props: { params: Promise<{ storeId: string }> },
) {
	const params = await props.params;
	const log = logger.child({ module: "rsvp-import" });

	try {
		// Check access first and get user ID (avoids duplicate auth import)
		const accessCheck = await CheckStoreAdminApiAccess(params.storeId);
		if (accessCheck instanceof NextResponse) {
			return accessCheck;
		}
		if (!accessCheck.success) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 403 },
			);
		}
		const currentUserId = accessCheck.userId;

		// Get request body - expect parsed RSVP data with pre-calculated rsvpTime
		const body = await req.json();
		const { rsvps } = body;

		if (!rsvps || !Array.isArray(rsvps) || rsvps.length === 0) {
			return NextResponse.json(
				{ success: false, error: "RSVP data is required" },
				{ status: 400 },
			);
		}

		// Get store and settings
		const store = await sqlClient.store.findUnique({
			where: { id: params.storeId },
			select: {
				id: true,
				organizationId: true,
				defaultTimezone: true,
				defaultCurrency: true,
				useCustomerCredit: true,
				creditExchangeRate: true,
				creditServiceExchangeRate: true,
			},
		});

		if (!store) {
			return NextResponse.json(
				{ success: false, error: "Store not found" },
				{ status: 404 },
			);
		}

		const storeTimezone = store.defaultTimezone || "Asia/Taipei";

		// Get current user's service staff record
		// Service staff must be the current signed-in user
		const serviceStaff = await sqlClient.serviceStaff.findFirst({
			where: {
				userId: currentUserId,
				storeId: params.storeId,
				isDeleted: false,
			},
			include: {
				User: {
					select: {
						name: true,
						email: true,
					},
				},
			},
		});

		// Throw error if current user is not a service staff
		if (!serviceStaff) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Current user is not a service staff. Please add yourself as service staff first.",
				},
				{ status: 400 },
			);
		}

		// Calculate cost using service staff's default cost
		const serviceStaffDefaultCost = serviceStaff.defaultCost
			? Number(serviceStaff.defaultCost)
			: 0;
		const serviceStaffDefaultDuration = serviceStaff.defaultDuration || 60;

		// Validate that service staff has a default cost configured
		if (serviceStaffDefaultCost <= 0) {
			return NextResponse.json(
				{
					success: false,
					error:
						"Service staff default cost is not configured. Please set default cost first.",
				},
				{ status: 400 },
			);
		}

		const result: ImportResult = {
			success: true,
			totalBlocks: 0,
			totalReservations: rsvps.length,
			createdReservations: 0,
			skippedReservations: 0,
			errors: [],
			warnings: [],
		};

		// Group RSVPs by blockIndex to process in blocks
		const rsvpsByBlock = new Map<number, typeof rsvps>();
		for (const rsvp of rsvps) {
			const blockIdx = rsvp.blockIndex ?? 0;
			if (!rsvpsByBlock.has(blockIdx)) {
				rsvpsByBlock.set(blockIdx, []);
			}
			rsvpsByBlock.get(blockIdx)!.push(rsvp);
		}

		result.totalBlocks = rsvpsByBlock.size;

		// Process each block
		for (const [blockIdx, blockRsvps] of rsvpsByBlock.entries()) {
			const blockIndex = blockIdx;
			const customerName = blockRsvps[0]?.customerName || "Unknown";
			const productName = blockRsvps[0]?.productName || "RSVP Import";

			try {
				// Get organizationId from store
				if (!store.organizationId) {
					result.errors.push({
						blockIndex,
						customerName,
						error: "Store organization not found",
					});
					continue;
				}

				// Find or create customer (User with member role "customer")
				let user = await sqlClient.user.findFirst({
					where: {
						name: customerName,
					},
					include: {
						members: {
							where: {
								organizationId: store.organizationId,
							},
						},
					},
				});

				// Create user if doesn't exist
				if (!user) {
					// Generate email from name
					const sanitizedName = customerName
						.replace(/[^a-zA-Z0-9]/g, "")
						.toLowerCase()
						.substring(0, 20);
					const timestamp = Date.now();
					const random = crypto.randomBytes(4).toString("hex");
					const generatedEmail = `${sanitizedName}-${timestamp}-${random}@import.riben.life`;

					user = await sqlClient.user.create({
						data: {
							email: generatedEmail,
							name: customerName,
							role: "user",
							locale: "tw",
						},
						include: {
							members: {
								where: {
									organizationId: store.organizationId,
								},
							},
						},
					});
				}

				// Ensure member relationship exists with role "customer"
				const existingMember = user.members?.find(
					(m: { organizationId: string }) =>
						m.organizationId === store.organizationId,
				);

				if (existingMember) {
					// Update member role to customer if needed
					if (existingMember.role !== MemberRole.customer) {
						await sqlClient.member.update({
							where: { id: existingMember.id },
							data: { role: MemberRole.customer },
						});
					}
				} else {
					// Create member relationship
					await sqlClient.member.create({
						data: {
							id: crypto.randomUUID(),
							userId: user.id,
							organizationId: store.organizationId,
							role: MemberRole.customer,
							createdAt: getUtcNow(),
						},
					});
				}

				// Use user.id as customerId
				const customerId = user.id;

				// Filter valid RSVPs (skip errors)
				const validRsvps = blockRsvps.filter(
					(rsvp) => rsvp.status !== "error" && rsvp.rsvpTime,
				);

				if (validRsvps.length === 0) {
					result.errors.push({
						blockIndex,
						customerName,
						error: "No valid RSVPs in block",
					});
					continue;
				}

				// Calculate total block amount for PAID RSVPs only
				const paidRsvps = validRsvps.filter((rsvp) => rsvp.alreadyPaid);
				const totalBlockAmount = paidRsvps.reduce(
					(sum, rsvp) => sum + (rsvp.cost || 0),
					0,
				);

				// Check if there are any paid RSVPs in the block
				const hasPaidRsvps = paidRsvps.length > 0;

				// Store block order ID for use in RSVP processing
				let blockOrderId: string | null = null;

				// Process block: Create TOPUP, update fiat balance, create StoreOrder
				// Create block order if there are any paid RSVPs (not requiring all to be paid)
				if (hasPaidRsvps && totalBlockAmount > 0) {
					blockOrderId = await sqlClient.$transaction(async (tx) => {
						const { t } = await getT();

						// Get current customer fiat balance
						const customerCredit = await tx.customerCredit.findUnique({
							where: {
								userId: customerId,
							},
						});

						const currentFiatBalance = customerCredit
							? Number(customerCredit.fiat)
							: 0;
						const newFiatBalance = currentFiatBalance + totalBlockAmount;

						// Update CustomerCredit.fiat
						await tx.customerCredit.upsert({
							where: {
								userId: customerId,
							},
							create: {
								userId: customerId,
								fiat: new Prisma.Decimal(newFiatBalance),
								point: new Prisma.Decimal(0),
								updatedAt: getUtcNowEpoch(),
							},
							update: {
								fiat: new Prisma.Decimal(newFiatBalance),
								updatedAt: getUtcNowEpoch(),
							},
						});

						// Create CustomerFiatLedger TOPUP entry
						const topupOrderId = crypto.randomUUID(); // Temporary order ID for TOPUP
						await tx.customerFiatLedger.create({
							data: {
								storeId: params.storeId,
								userId: customerId,
								amount: new Prisma.Decimal(totalBlockAmount), // Positive for TOPUP
								balance: new Prisma.Decimal(newFiatBalance),
								type: CustomerCreditLedgerType.Topup,
								referenceId: topupOrderId, // Will be updated with actual order ID
								note:
									t("rsvp_import_block_topup_note", {
										amount: totalBlockAmount,
										currency: (store.defaultCurrency || "twd").toUpperCase(),
										count: paidRsvps.length,
									}) ||
									`RSVP import block top-up: ${totalBlockAmount} ${(store.defaultCurrency || "twd").toUpperCase()} for ${paidRsvps.length} reservation(s)`,
								creatorId: currentUserId,
								createdAt: getUtcNowEpoch(),
							},
						});

						// Create ONE StoreOrder for the entire block
						const serviceStaffName =
							serviceStaff.User.name ||
							serviceStaff.User.email ||
							t("service_staff") ||
							"Service Staff";

						const blockOrderNote = `${
							t("rsvp_import_block_order_note") || "RSVP Import Block"
						}\n${t("customer") || "Customer"}: ${customerName}\n${
							t("service_staff") || "Service Staff"
						}: ${serviceStaffName}\n${
							t("total_reservations") || "Total Reservations"
						}: ${paidRsvps.length}`;

						// Use a placeholder RSVP ID for block order (since it's for the entire block)
						const blockRsvpId = crypto.randomUUID();
						const blockOrderId = await createRsvpStoreOrder({
							tx,
							storeId: params.storeId,
							customerId: customerId,
							facilityCost: null,
							serviceStaffCost: totalBlockAmount,
							currency: store.defaultCurrency || "twd",
							paymentMethodPayUrl: "cash", // Cash payment method for import
							rsvpId: blockRsvpId, // Placeholder RSVP ID for block order
							facilityId: null,
							productName: productName, // Product name from imported data
							serviceStaffId: null,
							serviceStaffName: null,
							rsvpTime: getUtcNowEpoch(), // Use current time for block order
							note: blockOrderNote,
							displayToCustomer: false,
							isPaid: true, // Block order is paid
						});

						// Update TOPUP ledger entry with actual order ID
						await tx.customerFiatLedger.updateMany({
							where: {
								storeId: params.storeId,
								userId: customerId,
								referenceId: topupOrderId,
								type: CustomerCreditLedgerType.Topup,
							},
							data: {
								referenceId: blockOrderId,
							},
						});

						return blockOrderId;
					});
				}

				// Process each RSVP (rsvpTime is already calculated in client)
				for (const rsvpData of blockRsvps) {
					try {
						// Skip invalid RSVPs
						if (rsvpData.status === "error") {
							result.skippedReservations++;
							result.errors.push({
								blockIndex,
								customerName,
								reservationNumber: rsvpData.reservationNumber,
								error: rsvpData.error || "Invalid RSVP data",
							});
							continue;
						}

						// Use pre-calculated rsvpTime from client
						if (!rsvpData.rsvpTime) {
							result.skippedReservations++;
							result.errors.push({
								blockIndex,
								customerName,
								reservationNumber: rsvpData.reservationNumber,
								error: "RSVP time is missing",
							});
							continue;
						}

						// Convert rsvpTime from ISO string to Date, then to epoch
						const rsvpTimeDate = new Date(rsvpData.rsvpTime);
						const rsvpTimeEpoch = dateToEpoch(rsvpTimeDate);
						if (!rsvpTimeEpoch) {
							result.skippedReservations++;
							result.errors.push({
								blockIndex,
								customerName,
								reservationNumber: rsvpData.reservationNumber,
								error: "Failed to convert date to epoch",
							});
							continue;
						}

						// Use pre-calculated cost from client
						const serviceStaffCost = rsvpData.cost;
						const alreadyPaid = rsvpData.alreadyPaid;

						// Use pre-calculated status and arriveTime from client
						const finalStatus: RsvpStatus = rsvpData.rsvpStatus;
						let finalArriveTime: bigint | null = null;

						// Convert arriveTime from ISO string to epoch (same as rsvpTime)
						if (rsvpData.arriveTime) {
							const arriveTimeDate = new Date(rsvpData.arriveTime);
							finalArriveTime = dateToEpoch(arriveTimeDate);
						}

						// Use block order ID (created earlier for paid blocks)

						// Create RSVP in transaction
						await sqlClient.$transaction(async (tx) => {
							// Create RSVP (link to block order)
							const createdRsvp = await tx.rsvp.create({
								data: {
									storeId: params.storeId,
									customerId: customerId,
									facilityId: null, // No facility for import
									serviceStaffId: serviceStaff.id,
									numOfAdult: 1,
									numOfChild: 0,
									rsvpTime: rsvpTimeEpoch,
									arriveTime: finalArriveTime,
									status: finalStatus,
									message: null,
									alreadyPaid,
									confirmedByStore: true,
									confirmedByCustomer: true,
									facilityCost: null, // No facility cost
									serviceStaffCost:
										serviceStaffCost > 0 ? serviceStaffCost : null,
									pricingRuleId: null,
									orderId: blockOrderId || null, // Link to block order
									createdBy: currentUserId,
									createdAt: getUtcNowEpoch(),
									updatedAt: getUtcNowEpoch(),
								},
							});

							// Process fiat payment based on RSVP status
							// Process if RSVP is paid and block order exists (for paid RSVPs)
							// Note: blockOrderId exists only if there are paid RSVPs in the block
							if (alreadyPaid && serviceStaffCost > 0 && blockOrderId) {
								// Get current customer fiat balance
								const customerCredit = await tx.customerCredit.findUnique({
									where: {
										userId: customerId,
									},
								});

								const currentFiatBalance = customerCredit
									? Number(customerCredit.fiat)
									: 0;

								if (finalStatus === RsvpStatus.Completed) {
									// Completed RSVP: Create PAYMENT + StoreLedger (Revenue)
									const { t: t2 } = await getT();
									const newFiatBalance = currentFiatBalance - serviceStaffCost;

									// Update CustomerCredit.fiat (deduct)
									await tx.customerCredit.update({
										where: {
											userId: customerId,
										},
										data: {
											fiat: new Prisma.Decimal(newFiatBalance),
											updatedAt: getUtcNowEpoch(),
										},
									});

									// Create CustomerFiatLedger Spend entry
									await tx.customerFiatLedger.create({
										data: {
											storeId: params.storeId,
											userId: customerId,
											amount: new Prisma.Decimal(-serviceStaffCost), // Negative for payment
											balance: new Prisma.Decimal(newFiatBalance),
											type: CustomerCreditLedgerType.Spend,
											referenceId: createdRsvp.id, // Link to RSVP
											note:
												t2("rsvp_completion_fiat_payment_note", {
													amount: serviceStaffCost,
													currency: (
														store.defaultCurrency || "twd"
													).toUpperCase(),
												}) ||
												`RSVP completion: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()}`,
											creatorId: currentUserId,
											createdAt: getUtcNowEpoch(),
										},
									});

									// Create StoreLedger entry for revenue recognition
									const lastLedger = await tx.storeLedger.findFirst({
										where: { storeId: params.storeId },
										orderBy: { createdAt: "desc" },
										take: 1,
									});

									const balance = Number(lastLedger ? lastLedger.balance : 0);
									const newStoreBalance = balance + serviceStaffCost;

									await tx.storeLedger.create({
										data: {
											storeId: params.storeId,
											orderId: blockOrderId, // Use block order ID
											amount: new Prisma.Decimal(serviceStaffCost),
											fee: new Prisma.Decimal(0),
											platformFee: new Prisma.Decimal(0),
											currency: (store.defaultCurrency || "twd").toLowerCase(),
											type: StoreLedgerType.StorePaymentProvider, // Revenue recognition
											balance: new Prisma.Decimal(newStoreBalance),
											description:
												t2("rsvp_completion_revenue_note_fiat", {
													amount: serviceStaffCost,
													currency: (
														store.defaultCurrency || "twd"
													).toUpperCase(),
												}) ||
												`RSVP completion revenue: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()}`,
											note: "",
											createdBy: currentUserId,
											availability: getUtcNowEpoch(),
											createdAt: getUtcNowEpoch(),
										},
									});
								} else if (finalStatus === RsvpStatus.Ready) {
									// Ready RSVP: Create HOLD (no StoreLedger yet)
									const { t: t3 } = await getT();
									const newFiatBalance = currentFiatBalance - serviceStaffCost;

									// Update CustomerCredit.fiat (deduct)
									await tx.customerCredit.update({
										where: {
											userId: customerId,
										},
										data: {
											fiat: new Prisma.Decimal(newFiatBalance),
											updatedAt: getUtcNowEpoch(),
										},
									});

									// Create CustomerFiatLedger HOLD entry
									await tx.customerFiatLedger.create({
										data: {
											storeId: params.storeId,
											userId: customerId,
											amount: new Prisma.Decimal(-serviceStaffCost), // Negative for hold
											balance: new Prisma.Decimal(newFiatBalance),
											type: CustomerCreditLedgerType.Hold,
											referenceId: createdRsvp.id, // Link to RSVP
											note:
												t3("rsvp_hold_fiat_payment_note", {
													amount: serviceStaffCost,
													currency: (
														store.defaultCurrency || "twd"
													).toUpperCase(),
												}) ||
												`RSVP hold: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()}`,
											creatorId: currentUserId,
											createdAt: getUtcNowEpoch(),
										},
									});
								}
							}
						});

						result.createdReservations++;
					} catch (error: unknown) {
						result.skippedReservations++;
						result.errors.push({
							blockIndex,
							customerName,
							reservationNumber: rsvpData.reservationNumber,
							error:
								error instanceof Error
									? error.message
									: "Failed to create reservation",
						});
						log.error("Failed to create reservation", {
							metadata: {
								storeId: params.storeId,
								customerName,
								reservationNumber: rsvpData.reservationNumber,
								error: error instanceof Error ? error.message : String(error),
							},
							tags: ["rsvp", "import", "error"],
						});
					}
				}
			} catch (error: unknown) {
				result.errors.push({
					blockIndex,
					customerName,
					error:
						error instanceof Error
							? error.message
							: "Failed to process customer block",
				});
				log.error("Failed to process customer block", {
					metadata: {
						storeId: params.storeId,
						blockIndex,
						customerName,
						error: error instanceof Error ? error.message : String(error),
					},
					tags: ["rsvp", "import", "error"],
				});
			}
		}

		// Determine overall success
		result.success =
			result.errors.length === 0 && result.createdReservations > 0;

		return NextResponse.json(result);
	} catch (error: unknown) {
		log.error("RSVP import failed", {
			metadata: {
				storeId: params.storeId,
				error: error instanceof Error ? error.message : String(error),
			},
			tags: ["rsvp", "import", "error"],
		});

		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to import RSVPs",
			},
			{ status: 500 },
		);
	}
}

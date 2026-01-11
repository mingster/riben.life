import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { CheckStoreAdminApiAccess } from "../../../api_helper";
import { getUtcNowEpoch, dateToEpoch, getUtcNow } from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";
import { RsvpStatus, MemberRole, StoreLedgerType } from "@/types/enum";
import crypto from "crypto";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { getT } from "@/app/i18n";
import { format } from "date-fns";

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
		// Check access first
		const accessCheck = await CheckStoreAdminApiAccess(params.storeId);
		if (accessCheck instanceof NextResponse) {
			return accessCheck;
		}
		if (accessCheck !== true) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 403 },
			);
		}

		// Get request body - expect parsed RSVP data with pre-calculated rsvpTime
		const body = await req.json();
		const { rsvps } = body;

		if (!rsvps || !Array.isArray(rsvps) || rsvps.length === 0) {
			return NextResponse.json(
				{ success: false, error: "RSVP data is required" },
				{ status: 400 },
			);
		}

		// Get current user from session
		const headersList = await headers();
		const session = await auth.api.getSession({
			headers: headersList,
		});
		if (!session?.user?.id) {
			return NextResponse.json(
				{ success: false, error: "Unauthenticated" },
				{ status: 401 },
			);
		}
		const currentUserId = session.user.id;

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

		// Group RSVPs by customer name to process in blocks
		const rsvpsByCustomer = new Map<string, typeof rsvps>();
		for (const rsvp of rsvps) {
			if (!rsvpsByCustomer.has(rsvp.customerName)) {
				rsvpsByCustomer.set(rsvp.customerName, []);
			}
			rsvpsByCustomer.get(rsvp.customerName)!.push(rsvp);
		}

		result.totalBlocks = rsvpsByCustomer.size;

		// Process each customer block
		for (const [customerName, customerRsvps] of rsvpsByCustomer.entries()) {
			const blockIndex = result.totalBlocks - rsvpsByCustomer.size;

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

				// Process each RSVP (rsvpTime is already calculated in client)
				for (const rsvpData of customerRsvps) {
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

						// Create RSVP in transaction
						await sqlClient.$transaction(async (tx) => {
							// Create RSVP
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
									confirmedByStore: false,
									confirmedByCustomer: false,
									facilityCost: null, // No facility cost
									serviceStaffCost:
										serviceStaffCost > 0 ? serviceStaffCost : null,
									pricingRuleId: null,
									createdBy: currentUserId,
									createdAt: getUtcNowEpoch(),
									updatedAt: getUtcNowEpoch(),
								},
							});

							let orderId: string | null = null;

							// Create StoreOrder if customer exists and cost > 0
							if (customerId && serviceStaffCost > 0) {
								const { t } = await getT();

								// Format RSVP time for order note
								const formattedRsvpTime = rsvpTimeDate
									? format(rsvpTimeDate, "yyyy-MM-dd HH:mm")
									: "";

								const serviceStaffName =
									serviceStaff.User.name ||
									serviceStaff.User.email ||
									t("service_staff") ||
									"Service Staff";

								const orderNote = `${t("rsvp_reservation_payment_note") || "RSVP Reservation"}\n${t("rsvp_id") || "RSVP ID"}: ${createdRsvp.id}\n${t("Service_Staff") || "Service Staff"}: ${serviceStaffName}\n${t("rsvp_time") || "Reservation Time"}: ${formattedRsvpTime}`;

								orderId = await createRsvpStoreOrder({
									tx,
									storeId: params.storeId,
									customerId: customerId,
									facilityCost: null, // No facility cost for import
									serviceStaffCost: serviceStaffCost,
									currency: store.defaultCurrency || "twd",
									paymentMethodPayUrl: alreadyPaid ? "credit" : "TBD", // Credit for prepaid, TBD for unpaid
									rsvpId: createdRsvp.id,
									facilityId: null, // No facility for import
									facilityName: "Service", // Placeholder facility name
									serviceStaffId: serviceStaff.id,
									serviceStaffName,
									rsvpTime: rsvpTimeEpoch,
									note: orderNote,
									displayToCustomer: false,
									isPaid: alreadyPaid,
								});

								// Update RSVP with orderId
								await tx.rsvp.update({
									where: { id: createdRsvp.id },
									data: { orderId },
								});

								// Process prepaid payment using fiat credit (always available, not controlled by useCustomerCredit)
								if (alreadyPaid && orderId && serviceStaffCost > 0) {
									const fiatAmount = serviceStaffCost;

									// Get customer fiat balance
									const customerCredit = await tx.customerCredit.findUnique({
										where: {
											storeId_userId: {
												storeId: params.storeId,
												userId: customerId,
											},
										},
									});

									const currentBalance = customerCredit
										? Number(customerCredit.fiat)
										: 0;

									if (currentBalance >= fiatAmount) {
										// If RSVP is completed (has arriveTime), deduct fiat and create StoreLedger immediately
										if (
											finalStatus === RsvpStatus.Completed &&
											finalArriveTime !== null
										) {
											// Deduct fiat from customer balance
											const newBalance = currentBalance - fiatAmount;

											// Update customer fiat balance
											await tx.customerCredit.update({
												where: {
													storeId_userId: {
														storeId: params.storeId,
														userId: customerId,
													},
												},
												data: {
													fiat: {
														decrement: fiatAmount,
													},
													updatedAt: getUtcNowEpoch(),
												},
											});

											// Create CustomerFiatLedger entry with PAYMENT type (completed RSVP)
											const { t: t2 } = await getT();
											await tx.customerFiatLedger.create({
												data: {
													storeId: params.storeId,
													userId: customerId,
													amount: new Prisma.Decimal(-fiatAmount), // Negative for payment
													balance: new Prisma.Decimal(newBalance),
													type: "PAYMENT", // PAYMENT type for completed RSVP
													referenceId: createdRsvp.id, // Link to RSVP
													note:
														t2("rsvp_completion_fiat_payment_note", {
															amount: fiatAmount,
															currency: (
																store.defaultCurrency || "twd"
															).toUpperCase(),
														}) ||
														`RSVP completion: ${fiatAmount} ${(store.defaultCurrency || "twd").toUpperCase()}`,
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

											const balance = Number(
												lastLedger ? lastLedger.balance : 0,
											);
											const newStoreBalance = balance + fiatAmount;

											await tx.storeLedger.create({
												data: {
													storeId: params.storeId,
													orderId,
													amount: new Prisma.Decimal(fiatAmount), // Positive for revenue
													fee: new Prisma.Decimal(0),
													platformFee: new Prisma.Decimal(0),
													currency: (
														store.defaultCurrency || "twd"
													).toLowerCase(),
													type: StoreLedgerType.CreditUsage, // Revenue recognition
													balance: new Prisma.Decimal(newStoreBalance),
													description:
														t2("rsvp_completion_revenue_note_fiat", {
															amount: fiatAmount,
															currency: (
																store.defaultCurrency || "twd"
															).toUpperCase(),
														}) ||
														`RSVP completion revenue: ${fiatAmount} ${(store.defaultCurrency || "twd").toUpperCase()}`,
													note: "",
													createdBy: currentUserId,
													availability: getUtcNowEpoch(),
													createdAt: getUtcNowEpoch(),
												},
											});
										} else {
											// RSVP is Ready (not completed) - create TOPUP ledger entry (HOLD design)
											// For Ready RSVPs, we don't deduct fiat yet - we create a TOPUP entry to track the hold
											// The fiat balance remains unchanged (already in account from user's initial topup)
											// When RSVP is completed, TOPUP will be converted to PAYMENT (deducting fiat and creating StoreLedger)

											// Create CustomerFiatLedger entry with TOPUP type (HOLD design for Ready RSVPs)
											await tx.customerFiatLedger.create({
												data: {
													storeId: params.storeId,
													userId: customerId,
													amount: new Prisma.Decimal(fiatAmount), // Positive for TOPUP (hold)
													balance: new Prisma.Decimal(currentBalance), // Balance unchanged (fiat already in account)
													type: "TOPUP", // TOPUP type (HOLD design for Ready RSVPs)
													referenceId: orderId, // Link to order
													note:
														t("rsvp_prepaid_payment_fiat_note", {
															amount: fiatAmount,
															currency: (
																store.defaultCurrency || "twd"
															).toUpperCase(),
														}) ||
														`RSVP prepaid payment (hold): ${fiatAmount} ${(store.defaultCurrency || "twd").toUpperCase()}`,
													creatorId: customerId,
													createdAt: getUtcNowEpoch(),
												},
											});

											// No StoreLedger entry is created at this stage (HOLD design)
											// Revenue will be recognized when RSVP is completed (converting TOPUP to PAYMENT)
										}
									} else {
										// Insufficient fiat credit - mark as error
										result.errors.push({
											blockIndex,
											customerName,
											reservationNumber: rsvpData.reservationNumber,
											error: `Insufficient fiat credit balance. Required: ${fiatAmount.toFixed(2)} ${(store.defaultCurrency || "twd").toUpperCase()}, Available: ${currentBalance.toFixed(2)} ${(store.defaultCurrency || "twd").toUpperCase()}`,
										});
										throw new Error(
											`Insufficient fiat credit balance for customer ${customerName}`,
										);
									}
								} else if (
									finalStatus === RsvpStatus.Completed &&
									!alreadyPaid &&
									store.useCustomerCredit &&
									store.creditServiceExchangeRate &&
									Number(store.creditServiceExchangeRate) > 0 &&
									store.creditExchangeRate &&
									Number(store.creditExchangeRate) > 0
								) {
									// RSVP is completed but not prepaid - deduct credit for service usage
									// Note: This requires a facility, but import doesn't have facilities
									// We'll skip credit deduction for completed non-prepaid RSVPs in import
									// They can be processed manually later or facility can be added
									result.warnings.push({
										blockIndex,
										customerName,
										message: `RSVP is completed but not prepaid. Credit deduction requires facility and will be skipped.`,
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

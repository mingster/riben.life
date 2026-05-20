import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import {
	assertStoreImportExportAccess,
	CheckStoreAdminApiAccess,
} from "@/app/api/storeAdmin/api_helper";
import {
	getUtcNowEpoch,
	dateToEpoch,
	getUtcNow,
	epochToDate,
	getDateInTz,
	getOffsetHours,
} from "@/utils/datetime-utils";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";
import {
	RsvpStatus,
	MemberRole,
	StoreLedgerType,
	CustomerCreditLedgerType,
} from "@/types/enum";
import crypto from "crypto";
import { generateCheckInCode } from "@/utils/check-in-code";
import { createRsvpStoreOrder } from "@/actions/store/reservation/create-rsvp-store-order";
import { getT } from "@/app/i18n";

interface ImportResult {
	success: boolean;
	totalBlocks: number;
	totalReservations: number;
	createdReservations: number;
	createdStoreOrders: number;
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
		const accessCheck = await CheckStoreAdminApiAccess(params.storeId);
		if (accessCheck instanceof NextResponse) {
			return accessCheck;
		}
		const importExportDenied = await assertStoreImportExportAccess(
			params.storeId,
		);
		if (importExportDenied) {
			return importExportDenied;
		}

		const currentUserId = accessCheck.userId;

		const body = await req.json();
		const { rsvps, storeOrders } = body;

		if (!rsvps || !Array.isArray(rsvps)) {
			return NextResponse.json(
				{ success: false, error: "RSVP data is required" },
				{ status: 400 },
			);
		}

		if (
			rsvps.length === 0 &&
			(!storeOrders || !Array.isArray(storeOrders) || storeOrders.length === 0)
		) {
			return NextResponse.json(
				{
					success: false,
					error: "Either RSVP data or store orders are required",
				},
				{ status: 400 },
			);
		}

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

		const result: ImportResult = {
			success: true,
			totalBlocks: 0,
			totalReservations: rsvps.length,
			createdReservations: 0,
			createdStoreOrders: 0,
			skippedReservations: 0,
			errors: [],
			warnings: [],
		};

		const rsvpsByBlock = new Map<number, typeof rsvps>();
		for (const rsvp of rsvps) {
			const blockIdx = rsvp.blockIndex ?? 0;
			if (!rsvpsByBlock.has(blockIdx)) {
				rsvpsByBlock.set(blockIdx, []);
			}
			rsvpsByBlock.get(blockIdx)!.push(rsvp);
		}

		const storeOrdersByBlock = new Map<number, (typeof storeOrders)[0]>();
		if (Array.isArray(storeOrders)) {
			for (const storeOrder of storeOrders) {
				const blockIdx = storeOrder.blockIndex ?? 0;
				storeOrdersByBlock.set(blockIdx, storeOrder);
			}
		}

		const blockIndicesFromRsvps = new Set(rsvps.map((r) => r.blockIndex ?? 0));
		const blockIndicesFromStoreOrders = new Set(
			Array.isArray(storeOrders)
				? storeOrders.map((so) => so.blockIndex ?? 0)
				: [],
		);
		const allBlockIndicesSet = new Set([
			...blockIndicesFromRsvps,
			...blockIndicesFromStoreOrders,
		]);
		result.totalBlocks = allBlockIndicesSet.size;

		const allBlockIndicesToProcess = new Set([
			...Array.from(rsvpsByBlock.keys()),
			...Array.from(storeOrdersByBlock.keys()),
		]);

		for (const blockIdx of allBlockIndicesToProcess) {
			const blockIndex = blockIdx;
			const blockRsvps = rsvpsByBlock.get(blockIndex) || [];
			const storeOrderInfo = storeOrdersByBlock.get(blockIndex);

			const customerName =
				blockRsvps[0]?.customerName ||
				storeOrderInfo?.customerName ||
				"Unknown";
			const productName =
				blockRsvps[0]?.productName ||
				storeOrderInfo?.productName ||
				"RSVP Import";

			try {
				if (!store.organizationId) {
					result.errors.push({
						blockIndex,
						customerName,
						error: "Store organization not found",
					});
					continue;
				}

				let user = await sqlClient.user.findFirst({
					where: { name: customerName },
					include: {
						members: {
							where: { organizationId: store.organizationId },
						},
					},
				});

				if (!user) {
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
								where: { organizationId: store.organizationId },
							},
						},
					});
				}

				const existingMember = user.members?.find(
					(m: { organizationId: string }) =>
						m.organizationId === store.organizationId,
				);

				if (existingMember) {
					if (existingMember.role !== MemberRole.customer) {
						await sqlClient.member.update({
							where: { id: existingMember.id },
							data: { role: MemberRole.customer },
						});
					}
				} else {
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

				const customerId = user.id;

				const paidRsvpsCount = blockRsvps.filter(
					(rsvp) => rsvp.alreadyPaid,
				).length;

				const totalBlockAmount =
					storeOrderInfo?.totalAmount !== undefined
						? Number(storeOrderInfo.totalAmount)
						: blockRsvps
								.filter((rsvp) => rsvp.alreadyPaid)
								.reduce((sum, rsvp) => sum + (rsvp.cost || 0), 0);

				const shouldCreateTopup =
					storeOrderInfo || (paidRsvpsCount > 0 && totalBlockAmount > 0);

				// Block-level: credit the customer's fiat balance (TOPUP).
				// Individual orders are created per RSVP below, so no block order is created here.
				let topupTempId: string | null = null;
				let topupRefUpdated = false;

				if (shouldCreateTopup) {
					const { t } = await getT();
					await sqlClient.$transaction(
						async (tx) => {
							const customerCredit = await tx.customerCredit.findUnique({
								where: { userId: customerId },
							});
							const currentFiatBalance = customerCredit
								? Number(customerCredit.fiat)
								: 0;
							const newFiatBalance = currentFiatBalance + totalBlockAmount;

							await tx.customerCredit.upsert({
								where: { userId: customerId },
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

							topupTempId = crypto.randomUUID();
							await tx.customerFiatLedger.create({
								data: {
									storeId: params.storeId,
									userId: customerId,
									amount: new Prisma.Decimal(totalBlockAmount),
									balance: new Prisma.Decimal(newFiatBalance),
									type: CustomerCreditLedgerType.Topup,
									referenceId: topupTempId,
									note:
										t("rsvp_import_block_topup_note", {
											amount: totalBlockAmount,
											currency: (store.defaultCurrency || "twd").toUpperCase(),
											count: paidRsvpsCount,
										}) ||
										`RSVP import block top-up: ${totalBlockAmount} ${(store.defaultCurrency || "twd").toUpperCase()} for ${paidRsvpsCount} reservation(s)`,
									creatorId: currentUserId,
									createdAt: getUtcNowEpoch(),
								},
							});
						},
						{ timeout: 15000 },
					);
				}

				// Process each RSVP: create RSVP + individual StoreOrder (like regular RSVP creation).
				for (const rsvpData of blockRsvps) {
					try {
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

						const serviceStaffCost = rsvpData.cost;
						const alreadyPaid = rsvpData.alreadyPaid;
						const finalStatus: RsvpStatus = rsvpData.rsvpStatus;

						let finalArriveTime: bigint | null = null;
						if (rsvpData.arriveTime) {
							const arriveTimeDate = new Date(rsvpData.arriveTime);
							finalArriveTime = dateToEpoch(arriveTimeDate);
						}

						let serviceStaffId: string | null = null;
						if (rsvpData.serviceStaffId) {
							const serviceStaff = await sqlClient.serviceStaff.findFirst({
								where: {
									id: rsvpData.serviceStaffId,
									storeId: params.storeId,
									isDeleted: false,
								},
							});

							if (!serviceStaff) {
								result.skippedReservations++;
								result.errors.push({
									blockIndex,
									customerName,
									reservationNumber: rsvpData.reservationNumber,
									error: "Service staff not found or does not belong to store",
								});
								continue;
							}

							serviceStaffId = serviceStaff.id;
						}

						// Create RSVP and its own StoreOrder in a single transaction,
						// mirroring the regular RSVP creation flow.
						const { t } = await getT();
						const { rsvpOrderId } = await sqlClient.$transaction(
							async (tx) => {
								const checkInCode = await generateCheckInCode(
									params.storeId,
									tx,
								);

								// Resolve service staff name for order line items and ledger notes.
								let staffName: string | null = null;
								if (serviceStaffId) {
									const staff = await tx.serviceStaff.findUnique({
										where: { id: serviceStaffId },
										select: {
											User: { select: { name: true, email: true } },
										},
									});
									staffName = staff?.User?.name || staff?.User?.email || null;
								}

								const createdRsvp = await tx.rsvp.create({
									data: {
										storeId: params.storeId,
										customerId,
										facilityId: null,
										serviceStaffId,
										checkInCode,
										numOfAdult: 1,
										numOfChild: 0,
										rsvpTime: rsvpTimeEpoch,
										arriveTime: finalArriveTime,
										status: finalStatus,
										alreadyPaid,
										confirmedByStore: true,
										confirmedByCustomer: true,
										facilityCost: null,
										serviceStaffCost:
											serviceStaffCost > 0 ? serviceStaffCost : null,
										pricingRuleId: null,
										orderId: null,
										createdBy: currentUserId,
										createdAt: getUtcNowEpoch(),
										updatedAt: getUtcNowEpoch(),
									},
								});

								// Create an individual StoreOrder for this RSVP (same structure
								// as regular RSVP creation: Reservation line + ServiceStaff line).
								let rsvpOrderId: string | null = null;
								if (serviceStaffCost > 0) {
									const orderNote = `${
										t("rsvp_reservation_payment_note") ||
										"RSVP reservation payment"
									} (RSVP ID: ${createdRsvp.id})`;

									rsvpOrderId = await createRsvpStoreOrder({
										tx,
										storeId: params.storeId,
										customerId,
										facilityCost: null,
										serviceStaffCost,
										currency: store.defaultCurrency || "twd",
										paymentMethodPayUrl: "cash",
										rsvpId: createdRsvp.id,
										facilityId: null,
										productName:
											staffName || rsvpData.productName || productName,
										serviceStaffId,
										serviceStaffName: staffName,
										rsvpTime: rsvpTimeEpoch,
										note: orderNote,
										displayToCustomer: false,
										isPaid: alreadyPaid,
									});

									await tx.rsvp.update({
										where: { id: createdRsvp.id },
										data: {
											orderId: rsvpOrderId,
											updatedAt: getUtcNowEpoch(),
										},
									});
								}

								// Deduct fiat balance for paid RSVPs (SPEND for Completed, HOLD for Ready).
								if (alreadyPaid && serviceStaffCost > 0 && rsvpOrderId) {
									const customerCredit = await tx.customerCredit.findUnique({
										where: { userId: customerId },
									});
									const currentFiatBalance = customerCredit
										? Number(customerCredit.fiat)
										: 0;

									let formattedRsvpTime = "";
									if (rsvpTimeEpoch) {
										const utcDate = epochToDate(rsvpTimeEpoch);
										if (utcDate) {
											const storeDate = getDateInTz(
												utcDate,
												getOffsetHours(storeTimezone),
											);
											const datetimeFormat =
												t("datetime_format") || "yyyy-MM-dd";
											formattedRsvpTime = format(
												storeDate,
												`${datetimeFormat} HH:mm`,
											);
										}
									}

									if (finalStatus === RsvpStatus.Completed) {
										const newFiatBalance =
											currentFiatBalance - serviceStaffCost;

										await tx.customerCredit.update({
											where: { userId: customerId },
											data: {
												fiat: new Prisma.Decimal(newFiatBalance),
												updatedAt: getUtcNowEpoch(),
											},
										});

										await tx.customerFiatLedger.create({
											data: {
												storeId: params.storeId,
												userId: customerId,
												amount: new Prisma.Decimal(-serviceStaffCost),
												balance: new Prisma.Decimal(newFiatBalance),
												type: CustomerCreditLedgerType.Spend,
												referenceId: createdRsvp.id,
												note:
													t("rsvp_completion_fiat_payment_note", {
														staffName: staffName ?? "",
														rsvpTime: formattedRsvpTime,
													}) ||
													`RSVP completion: ${staffName ?? ""}, RSVP Time: ${formattedRsvpTime}`,
												creatorId: currentUserId,
												createdAt: getUtcNowEpoch(),
											},
										});

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
												orderId: rsvpOrderId,
												amount: new Prisma.Decimal(serviceStaffCost),
												fee: new Prisma.Decimal(0),
												platformFee: new Prisma.Decimal(0),
												currency: (
													store.defaultCurrency || "twd"
												).toLowerCase(),
												type: StoreLedgerType.StorePaymentProvider,
												balance: new Prisma.Decimal(newStoreBalance),
												description: (() => {
													if (customerName && formattedRsvpTime) {
														return (
															t(
																"rsvp_completion_revenue_note_fiat_with_details",
																{
																	amount: serviceStaffCost,
																	currency: (
																		store.defaultCurrency || "twd"
																	).toUpperCase(),
																	customerName,
																	rsvpTime: formattedRsvpTime,
																},
															) ||
															`RSVP completion revenue: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()} (Customer: ${customerName}, RSVP Time: ${formattedRsvpTime})`
														);
													}
													if (customerName) {
														return (
															t(
																"rsvp_completion_revenue_note_fiat_with_customer",
																{
																	amount: serviceStaffCost,
																	currency: (
																		store.defaultCurrency || "twd"
																	).toUpperCase(),
																	customerName,
																},
															) ||
															`RSVP completion revenue: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()} (Customer: ${customerName})`
														);
													}
													if (formattedRsvpTime) {
														return (
															t("rsvp_completion_revenue_note_fiat_with_time", {
																amount: serviceStaffCost,
																currency: (
																	store.defaultCurrency || "twd"
																).toUpperCase(),
																rsvpTime: formattedRsvpTime,
															}) ||
															`RSVP completion revenue: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()} (RSVP Time: ${formattedRsvpTime})`
														);
													}
													return (
														t("rsvp_completion_revenue_note_fiat", {
															amount: serviceStaffCost,
															currency: (
																store.defaultCurrency || "twd"
															).toUpperCase(),
														}) ||
														`RSVP completion revenue: ${serviceStaffCost} ${(store.defaultCurrency || "twd").toUpperCase()}`
													);
												})(),
												note:
													t("rsvp_completion_fiat_payment_descr") ||
													"RSVP completion",
												createdBy: currentUserId,
												availability: getUtcNowEpoch(),
												createdAt: getUtcNowEpoch(),
											},
										});
									} else if (finalStatus === RsvpStatus.Ready) {
										const newFiatBalance =
											currentFiatBalance - serviceStaffCost;

										await tx.customerCredit.update({
											where: { userId: customerId },
											data: {
												fiat: new Prisma.Decimal(newFiatBalance),
												updatedAt: getUtcNowEpoch(),
											},
										});

										await tx.customerFiatLedger.create({
											data: {
												storeId: params.storeId,
												userId: customerId,
												amount: new Prisma.Decimal(-serviceStaffCost),
												balance: new Prisma.Decimal(newFiatBalance),
												type: CustomerCreditLedgerType.Hold,
												referenceId: createdRsvp.id,
												note:
													t("rsvp_hold_fiat_payment_note", {
														staffName: staffName ?? "",
														rsvpTime: formattedRsvpTime,
													}) ||
													`RSVP hold: ${staffName ?? ""}, RSVP Time: ${formattedRsvpTime}`,
												creatorId: currentUserId,
												createdAt: getUtcNowEpoch(),
											},
										});
									}
								}

								return { rsvpOrderId };
							},
							{ timeout: 30000 },
						);

						if (rsvpOrderId) {
							result.createdStoreOrders++;

							// Point the block TOPUP entry at the first RSVP's order so there
							// is a traceable link between the prepayment and a real order.
							if (topupTempId && !topupRefUpdated) {
								await sqlClient.customerFiatLedger.updateMany({
									where: {
										storeId: params.storeId,
										userId: customerId,
										referenceId: topupTempId,
										type: CustomerCreditLedgerType.Topup,
									},
									data: { referenceId: rsvpOrderId },
								});
								topupRefUpdated = true;
							}
						}

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

		result.success =
			result.errors.length === 0 &&
			(result.createdReservations > 0 || result.createdStoreOrders > 0);

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

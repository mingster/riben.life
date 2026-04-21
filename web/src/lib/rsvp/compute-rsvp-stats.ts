import { sqlClient } from "@/lib/prismadb";
import { MemberRole, RsvpStatus } from "@/types/enum";
import { epochToDate, getUtcNowEpoch } from "@/utils/datetime-utils";

export type RsvpStatsPeriod = "week" | "month" | "year" | "all" | "custom";

export interface ComputeRsvpStatsParams {
	storeId: string;
	period: RsvpStatsPeriod;
	startEpoch: bigint | null | undefined;
	endEpoch: bigint | null | undefined;
	/** When set, limit RSVP queries to rows created by this user (store staff scope). */
	staffFilter?: { createdBy: string };
}

export interface RsvpStatsPayload {
	readyCount: number;
	readyRsvps: Array<{
		rsvpTime: bigint;
		customerName: string;
		facilityName: string | null;
	}>;
	upcomingCount: number;
	upcomingTotalRevenue: number;
	upcomingFacilityCost: number;
	upcomingServiceStaffCost: number;
	completedCount: number;
	completedTotalRevenue: number;
	completedFacilityCost: number;
	completedServiceStaffCost: number;
	facilityStats: Array<{
		facilityId: string;
		facilityName: string;
		totalRevenue: number;
		count: number;
	}>;
	serviceStaffStats: Array<{
		serviceStaffId: string;
		staffName: string;
		totalRevenue: number;
		count: number;
	}>;
	customerCount: number;
	totalUnusedCredit: number;
	totalCustomerCount: number;
	newCustomerCount: number;
}

/**
 * Shared RSVP dashboard stats used by {@link getRsvpStatsAction} and store-admin API routes.
 */
export async function computeRsvpStats(
	params: ComputeRsvpStatsParams,
): Promise<RsvpStatsPayload> {
	const { storeId, period, startEpoch, endEpoch, staffFilter } = params;
	const now = getUtcNowEpoch();

	const isAllPeriod = period === "all";

	if (!isAllPeriod && (!startEpoch || !endEpoch)) {
		throw new Error("startEpoch and endEpoch are required for non-all periods");
	}

	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: {
			creditExchangeRate: true,
			organizationId: true,
		},
	});

	const startDate = startEpoch ? epochToDate(startEpoch) : null;
	const endDate = endEpoch ? epochToDate(endEpoch) : null;

	const [
		readyRsvps,
		upcomingRsvps,
		completedRsvps,
		unusedCreditResult,
		totalCustomerCount,
		newCustomerCount,
	] = await Promise.all([
		sqlClient.rsvp.findMany({
			where: {
				storeId,
				...(staffFilter ?? {}),
				status: RsvpStatus.Ready,
				...(isAllPeriod
					? {}
					: startEpoch && endEpoch
						? {
								rsvpTime: {
									gte: startEpoch,
									lte: endEpoch,
								},
							}
						: {}),
			},
			select: {
				id: true,
				rsvpTime: true,
				Customer: {
					select: {
						id: true,
						name: true,
					},
				},
				name: true,
				Facility: {
					select: {
						id: true,
						facilityName: true,
					},
				},
			},
			orderBy: {
				rsvpTime: "asc",
			},
		}),
		sqlClient.rsvp.findMany({
			where: {
				storeId,
				...(staffFilter ?? {}),
				rsvpTime: {
					gte: now,
				},
				AND: [
					{
						OR: [
							{
								status: {
									in: [RsvpStatus.Pending, RsvpStatus.Ready],
								},
							},
							{
								alreadyPaid: true,
							},
							{
								confirmedByStore: true,
							},
							{
								confirmedByCustomer: true,
							},
						],
					},
					{
						status: {
							notIn: [
								RsvpStatus.Completed,
								RsvpStatus.Cancelled,
								RsvpStatus.NoShow,
							],
						},
					},
				],
			},
			select: {
				facilityCost: true,
				serviceStaffCost: true,
			},
		}),
		sqlClient.rsvp.findMany({
			where: {
				storeId,
				...(staffFilter ?? {}),
				status: RsvpStatus.Completed,
				...(isAllPeriod
					? {}
					: startEpoch && endEpoch
						? {
								rsvpTime: {
									gte: startEpoch,
									lte: endEpoch,
								},
							}
						: {}),
			},
			select: {
				facilityId: true,
				facilityCost: true,
				serviceStaffId: true,
				serviceStaffCost: true,
				Facility: {
					select: {
						id: true,
						facilityName: true,
					},
				},
				ServiceStaff: {
					select: {
						id: true,
						User: {
							select: {
								id: true,
								name: true,
								email: true,
							},
						},
					},
				},
			},
		}),
		store?.organizationId
			? (async () => {
					const customerMembers = await sqlClient.member.findMany({
						where: {
							organizationId: store.organizationId,
							role: MemberRole.customer,
						},
						select: {
							userId: true,
						},
					});

					const customerUserIds = customerMembers.map((m) => m.userId);

					if (customerUserIds.length === 0) {
						return [0, { _sum: { fiat: null } }] as const;
					}

					return Promise.all([
						sqlClient.customerCredit.count({
							where: {
								userId: {
									in: customerUserIds,
								},
								fiat: {
									gt: 0,
								},
							},
						}),
						sqlClient.customerCredit.aggregate({
							where: {
								userId: {
									in: customerUserIds,
								},
								fiat: {
									gt: 0,
								},
							},
							_sum: {
								fiat: true,
							},
						}),
					]);
				})()
			: Promise.resolve([0, { _sum: { fiat: null } }] as const),
		store?.organizationId
			? sqlClient.member.count({
					where: {
						organizationId: store.organizationId,
						role: MemberRole.customer,
					},
				})
			: Promise.resolve(0),
		store?.organizationId
			? sqlClient.member.count({
					where: {
						organizationId: store.organizationId,
						role: MemberRole.customer,
						...(isAllPeriod
							? {}
							: startDate && endDate
								? {
										createdAt: {
											gte: startDate,
											lte: endDate,
										},
									}
								: {}),
					},
				})
			: Promise.resolve(0),
	]);

	const [unusedCreditCount, unusedCreditSum] = unusedCreditResult;
	const totalUnusedCredit = unusedCreditSum._sum.fiat
		? Number(unusedCreditSum._sum.fiat)
		: 0;

	const upcomingCount = upcomingRsvps.length;
	let upcomingTotalRevenue = 0;
	let upcomingFacilityCost = 0;
	let upcomingServiceStaffCost = 0;

	upcomingRsvps.forEach((rsvp) => {
		const facilityCost = rsvp.facilityCost ? Number(rsvp.facilityCost) : 0;
		const serviceStaffCost = rsvp.serviceStaffCost
			? Number(rsvp.serviceStaffCost)
			: 0;

		upcomingFacilityCost += facilityCost;
		upcomingServiceStaffCost += serviceStaffCost;
		upcomingTotalRevenue += facilityCost + serviceStaffCost;
	});

	const completedCount = completedRsvps.length;
	let completedTotalRevenue = 0;
	let completedFacilityCost = 0;
	let completedServiceStaffCost = 0;

	const facilityStatsMap = new Map<
		string,
		{
			facilityId: string;
			facilityName: string;
			totalRevenue: number;
			count: number;
		}
	>();

	const serviceStaffStatsMap = new Map<
		string,
		{
			serviceStaffId: string;
			staffName: string;
			totalRevenue: number;
			count: number;
		}
	>();

	completedRsvps.forEach((rsvp) => {
		const facilityCost = rsvp.facilityCost ? Number(rsvp.facilityCost) : 0;
		const serviceStaffCost = rsvp.serviceStaffCost
			? Number(rsvp.serviceStaffCost)
			: 0;

		completedFacilityCost += facilityCost;
		completedServiceStaffCost += serviceStaffCost;
		completedTotalRevenue += facilityCost + serviceStaffCost;

		if (rsvp.facilityId && rsvp.Facility) {
			const facilityId = rsvp.facilityId;
			const facilityName = rsvp.Facility.facilityName;
			const facilityRevenue = facilityCost + serviceStaffCost;

			const existing = facilityStatsMap.get(facilityId);
			if (existing) {
				existing.totalRevenue += facilityRevenue;
				existing.count += 1;
			} else {
				facilityStatsMap.set(facilityId, {
					facilityId,
					facilityName,
					totalRevenue: facilityRevenue,
					count: 1,
				});
			}
		}

		if (rsvp.serviceStaffId && rsvp.ServiceStaff) {
			const serviceStaffId = rsvp.serviceStaffId;
			const staffName =
				rsvp.ServiceStaff.User?.name ||
				rsvp.ServiceStaff.User?.email ||
				"Unknown";
			const staffRevenue = facilityCost + serviceStaffCost;

			const existing = serviceStaffStatsMap.get(serviceStaffId);
			if (existing) {
				existing.totalRevenue += staffRevenue;
				existing.count += 1;
			} else {
				serviceStaffStatsMap.set(serviceStaffId, {
					serviceStaffId,
					staffName,
					totalRevenue: staffRevenue,
					count: 1,
				});
			}
		}
	});

	const facilityStats = Array.from(facilityStatsMap.values()).sort(
		(a, b) => b.totalRevenue - a.totalRevenue,
	);
	const serviceStaffStats = Array.from(serviceStaffStatsMap.values()).sort(
		(a, b) => b.totalRevenue - a.totalRevenue,
	);

	const readyRsvpsDisplay = readyRsvps.map((rsvp) => {
		const customerName = rsvp.Customer?.name || rsvp.name || "Anonymous";
		const facilityName = rsvp.Facility?.facilityName || null;

		return {
			rsvpTime: rsvp.rsvpTime,
			customerName,
			facilityName,
		};
	});

	return {
		readyCount: readyRsvps.length,
		readyRsvps: readyRsvpsDisplay,
		upcomingCount,
		upcomingTotalRevenue,
		upcomingFacilityCost,
		upcomingServiceStaffCost,
		completedCount,
		completedTotalRevenue,
		completedFacilityCost,
		completedServiceStaffCost,
		facilityStats,
		serviceStaffStats,
		customerCount: unusedCreditCount,
		totalUnusedCredit,
		totalCustomerCount,
		newCustomerCount,
	};
}

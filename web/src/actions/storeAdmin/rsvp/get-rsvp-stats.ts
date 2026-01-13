"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { RsvpStatus, MemberRole } from "@/types/enum";
import { getUtcNowEpoch, epochToDate } from "@/utils/datetime-utils";
import { z } from "zod";

const getRsvpStatsSchema = z.object({
	period: z.enum(["week", "month", "year", "all"]).optional().default("month"),
	startEpoch: z.bigint().nullable().optional(),
	endEpoch: z.bigint().nullable().optional(),
});

export const getRsvpStatsAction = storeActionClient
	.metadata({ name: "getRsvpStats" })
	.schema(getRsvpStatsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { period = "month", startEpoch, endEpoch } = parsedInput;
		const now = getUtcNowEpoch();

		// For "all" period, don't filter by date range
		const isAllPeriod = period === "all";

		// Validate that date range is provided for non-"all" periods
		if (!isAllPeriod && (!startEpoch || !endEpoch)) {
			throw new Error(
				"startEpoch and endEpoch are required for non-all periods",
			);
		}

		// Get store to get creditExchangeRate and organizationId
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				creditExchangeRate: true,
				organizationId: true,
			},
		});

		const creditExchangeRate = store?.creditExchangeRate
			? Number(store.creditExchangeRate)
			: 1;

		// Convert epoch timestamps to Date for DateTime field queries (Member.createdAt)
		const startDate = startEpoch ? epochToDate(startEpoch) : null;
		const endDate = endEpoch ? epochToDate(endEpoch) : null;

		// Fetch stats in parallel
		const [
			upcomingRsvps,
			completedRsvps,
			unusedCreditResult,
			totalCustomerCount,
			newCustomerCount,
		] = await Promise.all([
			// Get upcoming reservations: active statuses (Pending, Ready) or (alreadyPaid, confirmedByStore, or confirmedByCustomer) and rsvpTime >= now
			sqlClient.rsvp.findMany({
				where: {
					storeId,
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

			// Get completed RSVPs in the selected period
			// For "all" period, don't filter by date range
			sqlClient.rsvp.findMany({
				where: {
					storeId,
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
					facilityCost: true,
					serviceStaffCost: true,
				},
			}),

			// Count and sum of unused fiat balance (fiat > 0) for customers in this store's organization
			// Since credit is now cross-store, we need to filter by organization members
			store?.organizationId
				? (async () => {
						// Get all customer user IDs for this store's organization
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

						// Count and sum CustomerCredit records for these users with fiat > 0
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

			// Count total customers in this store (all members with customer role in the organization)
			store?.organizationId
				? sqlClient.member.count({
						where: {
							organizationId: store.organizationId,
							role: MemberRole.customer,
						},
					})
				: Promise.resolve(0),

			// Count new customers created in the selected period
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

		// Calculate upcoming RSVP statistics
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

		// Calculate completed RSVP statistics
		const completedCount = completedRsvps.length;
		let completedTotalRevenue = 0;
		let completedFacilityCost = 0;
		let completedServiceStaffCost = 0;

		completedRsvps.forEach((rsvp) => {
			const facilityCost = rsvp.facilityCost ? Number(rsvp.facilityCost) : 0;
			const serviceStaffCost = rsvp.serviceStaffCost
				? Number(rsvp.serviceStaffCost)
				: 0;

			completedFacilityCost += facilityCost;
			completedServiceStaffCost += serviceStaffCost;
			completedTotalRevenue += facilityCost + serviceStaffCost;
		});

		return {
			// Upcoming RSVPs
			upcomingCount,
			upcomingTotalRevenue,
			upcomingFacilityCost,
			upcomingServiceStaffCost,

			// Completed RSVPs
			completedCount,
			completedTotalRevenue,
			completedFacilityCost,
			completedServiceStaffCost,

			// Customers
			customerCount: unusedCreditCount,
			totalUnusedCredit,
			totalCustomerCount,
			newCustomerCount,
		};
	});

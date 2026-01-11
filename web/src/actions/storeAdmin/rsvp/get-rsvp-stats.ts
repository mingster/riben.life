"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { RsvpStatus, CustomerCreditLedgerType } from "@/types/enum";
import {
	getUtcNowEpoch,
} from "@/utils/datetime-utils";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";

const getRsvpStatsSchema = z.object({
	period: z.enum(["week", "month", "year"]).optional().default("month"),
	startEpoch: z.bigint(),
	endEpoch: z.bigint(),
});

export const getRsvpStatsAction = storeActionClient
	.metadata({ name: "getRsvpStats" })
	.schema(getRsvpStatsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { period = "month", startEpoch, endEpoch } = parsedInput;
		const now = getUtcNowEpoch();

		// Get store to get creditExchangeRate
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				creditExchangeRate: true,
			},
		});

		const creditExchangeRate = store?.creditExchangeRate
			? Number(store.creditExchangeRate)
			: 1;

		// Fetch stats in parallel
		const [
			upcomingRsvps,
			completedRsvps,
			unusedCreditResult,
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
			sqlClient.rsvp.findMany({
				where: {
					storeId,
					status: RsvpStatus.Completed,
					rsvpTime: {
						gte: startEpoch,
						lte: endEpoch,
					},
				},
				select: {
					facilityCost: true,
					serviceStaffCost: true,
				},
			}),

			// Count and sum of unused credit (point > 0)
			Promise.all([
				sqlClient.customerCredit.count({
					where: {
						storeId,
						point: {
							gt: 0,
						},
					},
				}),
				sqlClient.customerCredit.aggregate({
					where: {
						storeId,
						point: {
							gt: 0,
						},
					},
					_sum: {
						point: true,
					},
				}),
			]),
		]);

		const [unusedCreditCount, unusedCreditSum] = unusedCreditResult;
		const totalUnusedCredit = unusedCreditSum._sum.point
			? Number(unusedCreditSum._sum.point)
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
		};
	});

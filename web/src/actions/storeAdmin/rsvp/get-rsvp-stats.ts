"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { RsvpStatus } from "@/types/enum";
import {
	getUtcNowEpoch,
	epochToDate,
	dateToEpoch,
} from "@/utils/datetime-utils";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";

const getRsvpStatsSchema = z.object({
	// No input needed - storeId comes from bindArgsClientInputs
});

export const getRsvpStatsAction = storeActionClient
	.metadata({ name: "getRsvpStats" })
	.schema(getRsvpStatsSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const now = getUtcNowEpoch();

		// Get start of current month (UTC)
		const nowDate = epochToDate(now);
		if (!nowDate) {
			throw new Error("Invalid date");
		}
		const startOfMonth = new Date(
			Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), 1),
		);
		const startOfMonthEpoch = dateToEpoch(startOfMonth);
		if (!startOfMonthEpoch) {
			throw new Error("Failed to convert start of month to epoch");
		}

		// Get end of current month (UTC)
		const endOfMonth = new Date(
			Date.UTC(
				nowDate.getUTCFullYear(),
				nowDate.getUTCMonth() + 1,
				0,
				23,
				59,
				59,
				999,
			),
		);
		const endOfMonthEpoch = dateToEpoch(endOfMonth);
		if (!endOfMonthEpoch) {
			throw new Error("Failed to convert end of month to epoch");
		}

		// Fetch stats in parallel
		const [upcomingCount, completedThisMonthCount, unusedCreditResult] =
			await Promise.all([
				// Upcoming reservations: active statuses (Pending, Ready) or (alreadyPaid, confirmedByStore, or confirmedByCustomer) and rsvpTime >= now
				sqlClient.rsvp.count({
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
				}),

				// Completed reservations this month
				sqlClient.rsvp.count({
					where: {
						storeId,
						status: RsvpStatus.Completed,
						rsvpTime: {
							gte: startOfMonthEpoch,
							lte: endOfMonthEpoch,
						},
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

		return {
			upcomingCount,
			completedThisMonthCount,
			unusedCreditCount,
			totalUnusedCredit,
		};
	});

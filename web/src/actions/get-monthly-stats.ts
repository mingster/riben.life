"use server";

import { sqlClient } from "@/lib/prismadb";
import { RsvpStatus } from "@/types/enum";
import { format } from "date-fns";

export interface MonthlyStats {
	date: string; // YYYY-MM-DD (first day of month)
	month: string; // MMM (e.g., "Jan")
	revenue: number;
	rsvpCount: number;
}

export async function getMonthlyStats(
	storeId: string,
	year: number = new Date().getFullYear(),
): Promise<MonthlyStats[]> {
	// Define start and end of the year in UTC Epoch milliseconds
	// Note: We use UTC for simplicity as data is stored in Epoch.
	// Ideally, we should align with store timezone, but for monthly aggregation,
	// strict timezone alignment might be overkill effectively handled by mostly falling in correct buckets or can be improved later.
	// We will simply treat logical year boundaries.

	const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
	const endOfYear = new Date(`${year}-12-31T23:59:59.000Z`);

	const startEpoch = BigInt(startOfYear.getTime());
	const endEpoch = BigInt(endOfYear.getTime());

	// Fetch StoreLedger entries for orders that have RSVPs
	// We use RSVP's rsvpTime for revenue attribution (group by month of RSVP time)
	const ledgerEntries = await sqlClient.storeLedger.findMany({
		where: {
			storeId: storeId,
			StoreOrder: {
				Rsvp: {
					some: {
						rsvpTime: {
							gte: startEpoch,
							lt: endEpoch,
						},
						status: {
							in: [RsvpStatus.Completed],
						},
					},
				},
			},
		},
		select: {
			amount: true,
			StoreOrder: {
				select: {
					id: true,
					Rsvp: {
						where: {
							rsvpTime: {
								gte: startEpoch,
								lt: endEpoch,
							},
							status: {
								in: [RsvpStatus.Completed],
							},
						},
						select: {
							rsvpTime: true,
						},
					},
				},
			},
		},
	});

	// Fetch RSVPs for count
	// We use 'rsvpTime' for RSVP counting
	const rsvps = await sqlClient.rsvp.findMany({
		where: {
			storeId: storeId,
			rsvpTime: {
				gte: startEpoch,
				lt: endEpoch,
			},
			status: {
				in: [RsvpStatus.Completed],
			},
		},
		select: {
			rsvpTime: true,
		},
	});

	// Initialize monthly buckets
	const stats: Record<number, MonthlyStats> = {};
	for (let i = 0; i < 12; i++) {
		const monthDate = new Date(Date.UTC(year, i, 1));
		stats[i] = {
			date: monthDate.toISOString().split("T")[0],
			month: format(monthDate, "MMM"),
			revenue: 0,
			rsvpCount: 0,
		};
	}

	// Aggregate Revenue from StoreLedger entries
	// Group by month of RSVP time and sum ledger amounts
	// Each RSVP gets the ledger amount attributed to its month
	for (const ledger of ledgerEntries) {
		if (ledger.StoreOrder.Rsvp.length === 0) continue;

		const ledgerAmount = Number(ledger.amount);

		// For each RSVP in this order, attribute the ledger amount to the RSVP's month
		// If an order has multiple RSVPs in different months, the ledger amount is counted in each month
		for (const rsvp of ledger.StoreOrder.Rsvp) {
			if (!rsvp.rsvpTime) continue;

			const date = new Date(Number(rsvp.rsvpTime));
			// Use UTC month to align with our buckets
			const month = date.getUTCMonth();
			if (stats[month]) {
				stats[month].revenue += ledgerAmount;
			}
		}
	}

	// Aggregate RSVP Count
	for (const rsvp of rsvps) {
		if (!rsvp.rsvpTime) continue;
		const date = new Date(Number(rsvp.rsvpTime));
		const month = date.getUTCMonth();
		if (stats[month]) {
			stats[month].rsvpCount += 1;
		}
	}

	/*
    // debug: show start/end datetime
    console.log("startOfYear", startOfYear);
    console.log("endOfYear", endOfYear);
    console.log("stats", stats);
    */

	return Object.values(stats);
}

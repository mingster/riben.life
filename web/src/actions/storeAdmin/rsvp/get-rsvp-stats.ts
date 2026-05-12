"use server";

import { Role } from "@prisma/client";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { computeRsvpStats } from "@/lib/reservation/compute-rsvp-stats";
import { storeActionClient } from "@/utils/actions/safe-action";

const getRsvpStatsSchema = z.object({
	period: z
		.enum(["week", "month", "year", "all", "custom"])
		.optional()
		.default("month"),
	startEpoch: z.bigint().nullable().optional(),
	endEpoch: z.bigint().nullable().optional(),
});

export const getRsvpStatsAction = storeActionClient
	.metadata({ name: "getRsvpStats" })
	.schema(getRsvpStatsSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { period = "month", startEpoch, endEpoch } = parsedInput;

		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const currentUserId = session?.user?.id;
		const userRole = session?.user?.role;
		const isStaff = userRole === Role.staff;

		const staffFilter =
			isStaff && currentUserId ? { createdBy: currentUserId } : undefined;

		return computeRsvpStats({
			storeId,
			period,
			startEpoch,
			endEpoch,
			staffFilter,
		});
	});

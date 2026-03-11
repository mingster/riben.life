"use server";

import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import { listWaitlistSchema } from "./list-waitlist.validation";

export const listWaitlistAction = storeActionClient
	.metadata({ name: "listWaitlist" })
	.schema(listWaitlistSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { statusFilter } = parsedInput;

		const where =
			statusFilter === "active"
				? { storeId, status: { in: ["waiting", "called"] as const } }
				: { storeId };

		const entries = await sqlClient.waitList.findMany({
			orderBy: [{ queueNumber: "asc" }, { createdAt: "asc" }],
			include: {
				Facility: { select: { id: true, facilityName: true } },
			},
		});

		transformPrismaDataForJson(entries);
		return { entries };
	});

"use server";

import { sqlClient } from "@/lib/prismadb";
import { buildWaitlistListWhere } from "@/lib/store/waitlist/build-waitlist-list-where";
import { storeActionClient } from "@/utils/actions/safe-action";
import { transformPrismaDataForJson } from "@/utils/utils";
import { listWaitlistSchema } from "./list-waitlist.validation";
import type { WaitlistListEntry } from "./waitlist-list-entry";

const ALL_SCOPE_MAX_ROWS = 300;

/**
 * Maps Prisma waitlist rows to serialized list entries (BigInt → number for epochs).
 * Use after {@link transformPrismaDataForJson} so runtime values match; mapping gives correct TS types.
 */
function mapWaitListRowsToListEntries(
	rows: Awaited<ReturnType<typeof sqlClient.waitList.findMany>>,
): WaitlistListEntry[] {
	return rows.map((row) => ({
		id: row.id,
		storeId: row.storeId,
		queueNumber: row.queueNumber,
		sessionBlock: String(row.sessionBlock),
		verificationCode: row.verificationCode,
		numOfAdult: row.numOfAdult,
		numOfChild: row.numOfChild,
		customerId: row.customerId,
		name: row.name,
		lastName: row.lastName,
		phone: row.phone,
		message: row.message,
		status: String(row.status),
		waitTimeMs:
			row.waitTimeMs !== null && row.waitTimeMs !== undefined
				? Number(row.waitTimeMs)
				: null,
		createdBy: row.createdBy,
		createdAt: Number(row.createdAt),
		updatedAt: Number(row.updatedAt),
		notifiedAt:
			row.notifiedAt !== null && row.notifiedAt !== undefined
				? Number(row.notifiedAt)
				: null,
		orderId: row.orderId,
	}));
}

export const listWaitlistAction = storeActionClient
	.metadata({ name: "listWaitlist" })
	.schema(listWaitlistSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { statusFilter, sessionScope } = parsedInput;

		const where = await buildWaitlistListWhere(storeId, {
			statusFilter,
			sessionScope,
		});

		const entries = await sqlClient.waitList.findMany({
			where,
			orderBy:
				sessionScope === "all"
					? [{ createdAt: "desc" }]
					: [
							{ sessionBlock: "asc" },
							{ queueNumber: "asc" },
							{ createdAt: "asc" },
						],
			take: sessionScope === "all" ? ALL_SCOPE_MAX_ROWS : undefined,
		});

		transformPrismaDataForJson(entries);
		return { entries: mapWaitListRowsToListEntries(entries) };
	});

import { WaitListStatus } from "@prisma/client";
import { z } from "zod";

export const listWaitlistSchema = z.object({
	statusFilter: z
		.union([z.nativeEnum(WaitListStatus), z.literal("all")])
		.optional()
		.default(WaitListStatus.waiting),
	/** current_session: today's band matching store hours (or full day when closed); today: all bands today; all: recent */
	sessionScope: z
		.enum(["current_session", "today", "all"])
		.optional()
		.default("current_session"),
});

export type ListWaitlistInput = z.infer<typeof listWaitlistSchema>;

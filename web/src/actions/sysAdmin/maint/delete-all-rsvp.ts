"use server";
import logger from "@/lib/logger";
import { deleteAllRsvpDataCore } from "./delete-rsvp-data-core";

export const deleteAllRsvp = async () => {
	// RsvpSettings are kept (configuration). All RSVP data uses deleteAllRsvpDataCore
	// (child tables first) so maintenance does not fail on bad 1:1 data.
	const counts = await deleteAllRsvpDataCore();

	logger.info("Deleted all RSVP data", {
		metadata: {
			...counts,
		},
		tags: ["action", "maintenance", "rsvp"],
	});

	return {
		rsvpCount: counts.rsvpCount,
		blacklistCount: counts.rsvpBlacklistCount,
		tagCount: counts.rsvpTagCount,
	};
};

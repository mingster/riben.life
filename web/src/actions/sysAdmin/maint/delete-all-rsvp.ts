"use server";
import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";

export const deleteAllRsvp = async () => {
	// Delete all RSVP-related data
	// Note: RsvpSettings are kept as they are configuration, not data

	// Delete all RSVP tags first
	const tagCount = await sqlClient.rsvpTag.deleteMany({
		where: {},
	});

	// Delete all RSVP blacklist entries
	const blacklistCount = await sqlClient.rsvpBlacklist.deleteMany({
		where: {},
	});

	// Delete all RSVP reservations
	const rsvpCount = await sqlClient.rsvp.deleteMany({
		where: {},
	});

	logger.info("Deleted all RSVP data", {
		metadata: {
			rsvpCount: rsvpCount.count,
			blacklistCount: blacklistCount.count,
			tagCount: tagCount.count,
		},
		tags: ["action", "maintenance", "rsvp"],
	});

	return {
		rsvpCount: rsvpCount.count,
		blacklistCount: blacklistCount.count,
		tagCount: tagCount.count,
	};
};

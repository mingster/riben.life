/**
 * Debug script for LINE staff commands ("confirm" and "complete").
 *
 * Usage:
 *   bun run scripts/debug-line-staff-commands.ts --lineUserId <LINE_UID> --storeId <STORE_ID>
 *   bun run scripts/debug-line-staff-commands.ts --lineUserId <LINE_UID> --channelId <CHANNEL_ID>
 *   bun run scripts/debug-line-staff-commands.ts --storeId <STORE_ID>  # List today's RSVPs only
 *
 * Options:
 *   --lineUserId  LINE user ID (from event.source.userId)
 *   --storeId     Store ID
 *   --channelId   LINE channel ID (destination) - used to find store if storeId not provided
 *   --test-complete <RSVP_ID>  Test completeRsvpById (mutates DB)
 */

import { sqlClient } from "@/lib/prismadb";
import { Role } from "@prisma/client";
import { RsvpStatus } from "@/types/enum";
import {
	getDateInTz,
	getTimezoneOffsetForDate,
	dateToEpoch,
	epochToDate,
	formatDateTime,
} from "@/utils/datetime-utils";
import { completeRsvpById } from "@/actions/storeAdmin/rsvp/complete-rsvp";

const STORE_STAFF_ROLES = [Role.owner, Role.staff, Role.storeAdmin, Role.admin];

function getTodayStartEndEpoch(storeTimezone: string): {
	startEpoch: bigint;
	endEpoch: bigint;
} {
	const now = new Date(Date.now());
	const offsetHours = getTimezoneOffsetForDate(now, storeTimezone);
	const todayInStoreTz = getDateInTz(now, offsetHours);
	const y = todayInStoreTz.getUTCFullYear();
	const m = todayInStoreTz.getUTCMonth();
	const d = todayInStoreTz.getUTCDate();

	const startUtc = new Date(Date.UTC(y, m, d, -offsetHours, 0, 0, 0));
	const endUtc = new Date(
		Date.UTC(y, m, d, 24 - offsetHours, 0, 0, 0) - 1,
	);

	const startEpoch = dateToEpoch(startUtc) ?? BigInt(0);
	const endEpoch = dateToEpoch(endUtc) ?? BigInt(0);
	return { startEpoch, endEpoch };
}

function parseArgs(): {
	lineUserId?: string;
	storeId?: string;
	channelId?: string;
	testCompleteRsvpId?: string;
} {
	const args = process.argv.slice(2);
	const result: Record<string, string | undefined> = {};

	for (let i = 0; i < args.length; i++) {
		if (args[i]?.startsWith("--")) {
			const key = args[i].slice(2);
			const next = args[i + 1];
			result[key] =
				next && !next.startsWith("--") ? next : undefined;
		}
	}

	return {
		lineUserId: result.lineUserId,
		storeId: result.storeId,
		channelId: result.channelId,
		testCompleteRsvpId: result["test-complete"],
	};
}

async function findStoreByChannelId(
	channelId: string,
): Promise<{ id: string; name: string | null; organizationId: string; ownerId: string; defaultTimezone: string } | null> {
	const channelConfigs = await sqlClient.notificationChannelConfig.findMany({
		where: { channel: "line" },
		include: {
			Store: {
				select: {
					id: true,
					name: true,
					ownerId: true,
					organizationId: true,
					defaultTimezone: true,
				},
			},
		},
	});

	for (const config of channelConfigs) {
		if (!config.credentials) continue;
		try {
			const credentials =
				typeof config.credentials === "string"
					? JSON.parse(config.credentials)
					: config.credentials;
			if (credentials.channelId === channelId) {
				return config.Store;
			}
		} catch {
			// skip
		}
	}
	return null;
}

async function main() {
	const { lineUserId, storeId, channelId, testCompleteRsvpId } = parseArgs();

	console.log("\n=== LINE Staff Commands Debug ===\n");

	if (!lineUserId && !storeId && !channelId && !testCompleteRsvpId) {
		console.log("Usage:");
		console.log("  bun run debug:line-staff -- --storeId <STORE_ID>");
		console.log("  bun run debug:line-staff -- --lineUserId <LINE_UID> --storeId <STORE_ID>");
		console.log("  bun run debug:line-staff -- --lineUserId <LINE_UID> --channelId <CHANNEL_ID>");
		console.log("  bun run debug:line-staff -- --storeId <STORE_ID> --test-complete <RSVP_ID>");
		console.log("\nOptions:");
		console.log("  --lineUserId    LINE user ID (event.source.userId) - check staff status");
		console.log("  --storeId       Store ID");
		console.log("  --channelId     LINE channel ID (destination) - finds store from config");
		console.log("  --test-complete RSVP ID - test completeRsvpById (mutates DB)\n");
		process.exit(0);
	}

	let store: {
		id: string;
		name: string | null;
		organizationId: string;
		ownerId: string;
		defaultTimezone: string;
	} | null = null;

	if (storeId) {
		store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: {
				id: true,
				name: true,
				ownerId: true,
				organizationId: true,
				defaultTimezone: true,
			},
		});
		if (!store) {
			console.error(`✗ Store not found: ${storeId}`);
			process.exit(1);
		}
		console.log(`Store: ${store.name} (${store.id})`);
		console.log(`  Timezone: ${store.defaultTimezone}`);
		console.log(`  Owner: ${store.ownerId}`);
	} else if (channelId) {
		store = await findStoreByChannelId(channelId);
		if (!store) {
			console.error(`✗ No store found for channelId: ${channelId}`);
			process.exit(1);
		}
		console.log(`Store (from channelId): ${store.name} (${store.id})`);
		console.log(`  Timezone: ${store.defaultTimezone}`);
	} else if (!testCompleteRsvpId) {
		console.error(
			"Usage: provide --storeId or --channelId (or --test-complete with storeId)",
		);
		process.exit(1);
	}

	if (lineUserId && store) {
		console.log("\n--- User check ---");
		const user = await sqlClient.user.findFirst({
			where: { line_userId: lineUserId },
			select: { id: true, name: true, line_userId: true },
		});

		if (!user) {
			console.error(`✗ User not found for line_userId: ${lineUserId}`);
			console.log("  → User must have LINE account linked (line_userId in DB)");
		} else {
			console.log(`User: ${user.name} (${user.id})`);
			console.log(`  line_userId: ${user.line_userId}`);

			// Staff check
			const isOwner = store.ownerId === user.id;
			const member = await sqlClient.member.findFirst({
				where: {
					userId: user.id,
					organizationId: store.organizationId,
					role: { in: STORE_STAFF_ROLES },
				},
				select: { id: true, role: true },
			});

			const isStaff = isOwner || member != null;
			console.log(`  Is store staff: ${isStaff ? "✓ YES" : "✗ NO"}`);
			if (isOwner) console.log("    (store owner)");
			else if (member) console.log(`    (member role: ${member.role})`);
			else
				console.log(
					"    → Add user as member of store's organization with owner/staff/storeAdmin",
				);
		}
	}

	if (store) {
		const { startEpoch, endEpoch } = getTodayStartEndEpoch(
			store.defaultTimezone,
		);
		const offsetHours = getTimezoneOffsetForDate(
			new Date(),
			store.defaultTimezone,
		);

		console.log("\n--- Today's RSVPs (store timezone) ---");
		console.log(
			`  Epoch range: ${startEpoch} - ${endEpoch}`,
		);

		const readyToConfirm = await sqlClient.rsvp.findMany({
			where: {
				storeId: store.id,
				rsvpTime: { gte: startEpoch, lte: endEpoch },
				status: RsvpStatus.ReadyToConfirm,
			},
			include: { Facility: { select: { facilityName: true } } },
		});

		const ready = await sqlClient.rsvp.findMany({
			where: {
				storeId: store.id,
				rsvpTime: { gte: startEpoch, lte: endEpoch },
				status: RsvpStatus.Ready,
			},
			include: { Facility: { select: { facilityName: true } } },
		});

		console.log(`\n  ReadyToConfirm (待確認) - for "confirm" command: ${readyToConfirm.length}`);
		for (const r of readyToConfirm) {
			const d = epochToDate(r.rsvpTime);
			const inTz = d ? getDateInTz(d, offsetHours) : null;
			const timeStr = inTz ? formatDateTime(inTz) : "?";
			const facility = r.Facility?.facilityName ?? "-";
			console.log(`    • ${r.id} | ${timeStr} | ${facility}`);
		}

		console.log(`\n  Ready (預約中) - for "complete" command: ${ready.length}`);
		for (const r of ready) {
			const d = epochToDate(r.rsvpTime);
			const inTz = d ? getDateInTz(d, offsetHours) : null;
			const timeStr = inTz ? formatDateTime(inTz) : "?";
			const facility = r.Facility?.facilityName ?? "-";
			console.log(`    • ${r.id} | ${timeStr} | ${facility}`);
		}
	}

	if (testCompleteRsvpId && storeId) {
		console.log("\n--- Test completeRsvpById ---");
		console.log(`  RSVP ID: ${testCompleteRsvpId}`);
		try {
			const result = await completeRsvpById(storeId, testCompleteRsvpId);
			console.log("  ✓ Success:", result.rsvp?.id);
		} catch (err) {
			console.error("  ✗ Failed:", err instanceof Error ? err.message : err);
		}
	}

	console.log("\n=== Done ===\n");
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});

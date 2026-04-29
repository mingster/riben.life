/**
 * Shared service staff data fetching.
 * Used by both storeAdmin and store reservation flows.
 */

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { transformPrismaDataForJson } from "@/utils/utils";
import { mapServiceStaffToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { MemberRole } from "@/types/enum";
import { getServiceStaffBusinessHoursBatch } from "@/utils/service-staff-schedule-utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";
import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";

/**
 * Member roles allowed in service staff list (owner, staff only).
 * Rows for the store's `ownerId` are always kept even if org member role is
 * different (e.g. storeAdmin) or missing — so the original creator stays visible.
 */
const ALLOWED_MEMBER_ROLES = [MemberRole.owner, MemberRole.staff] as const;

/** True when capacity is a finite number greater than 0 (customer booking should not list others). */
function hasPositiveCapacity(capacity: unknown): boolean {
	const n = Number(capacity);
	return Number.isFinite(n) && n > 0;
}

export interface GetServiceStaffOptions {
	/** When set, return staff with schedules for facility/default and staff with NO schedules (use StoreSettings.businessHours) */
	facilityId?: string;
	/** When set, filter staff to those available at this time (ISO string). */
	rsvpTimeIso?: string;
	/** Store timezone for time checks (e.g. "Asia/Taipei"). Required when rsvpTimeIso is provided. */
	storeTimezone?: string;
	/** Staff IDs to always include (e.g. assigned staff in edit mode), even if filtered out by availability */
	includeStaffIds?: string[];
	/**
	 * When true, excludes staff with `capacity <= 0` except those in `includeStaffIds`.
	 * Use for customer booking and picker UIs; keep false on service-staff CRUD listings.
	 */
	excludeZeroCapacity?: boolean;
}

/**
 * Fetch service staff for a store. Shared by storeAdmin and store reservation flows.
 *
 * @param storeId - Store ID
 * @param options - Optional facility, rsvpTimeIso, storeTimezone for filtering
 * @returns Array of ServiceStaffColumn
 * @throws SafeError if store not found
 */
export async function getServiceStaffData(
	storeId: string,
	options: GetServiceStaffOptions = {},
): Promise<ServiceStaffColumn[]> {
	const {
		facilityId,
		rsvpTimeIso,
		storeTimezone,
		includeStaffIds = [],
		excludeZeroCapacity = false,
	} = options;

	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: { id: true, organizationId: true, ownerId: true },
	});

	if (!store) {
		throw new SafeError("Store not found");
	}

	// When facilityId is provided: include (a) staff with schedules for facility/default, (b) staff with NO schedules (use StoreSettings.businessHours), (c) staff in includeStaffIds, (d) store owner’s ServiceStaff row (never drop creator)
	let serviceStaffIdsToInclude: string[] | null = null;
	if (facilityId) {
		const [staffWithFacilityOrDefaultSchedule, staffWithAnySchedule, allStaff] =
			await Promise.all([
				sqlClient.serviceStaffFacilitySchedule.findMany({
					where: {
						storeId,
						isActive: true,
						OR: [{ facilityId }, { facilityId: null }],
					},
					select: { serviceStaffId: true },
					distinct: ["serviceStaffId"],
				}),
				sqlClient.serviceStaffFacilitySchedule.findMany({
					where: { storeId, isActive: true },
					select: { serviceStaffId: true },
					distinct: ["serviceStaffId"],
				}),
				sqlClient.serviceStaff.findMany({
					where: { storeId, isDeleted: false },
					select: { id: true, userId: true },
				}),
			]);
		const hasFacilityOrDefault = new Set(
			staffWithFacilityOrDefaultSchedule.map((s) => s.serviceStaffId),
		);
		const hasAnySchedule = new Set(
			staffWithAnySchedule.map((s) => s.serviceStaffId),
		);
		const staffWithNoSchedules = allStaff
			.filter((s) => !hasAnySchedule.has(s.id))
			.map((s) => s.id);
		const ownerServiceStaffId = allStaff.find(
			(s) => s.userId === store.ownerId,
		)?.id;
		serviceStaffIdsToInclude = [
			...new Set([
				...hasFacilityOrDefault,
				...staffWithNoSchedules,
				...includeStaffIds,
				...(ownerServiceStaffId ? [ownerServiceStaffId] : []),
			]),
		];
	}

	// Customer booking: exclude zero-capacity rows at DB level (edit mode still needs assigned staff via includeStaffIds)
	const capacityBookingFilter =
		excludeZeroCapacity && includeStaffIds.length > 0
			? {
					OR: [{ capacity: { gt: 0 } }, { id: { in: includeStaffIds } }],
				}
			: excludeZeroCapacity
				? { capacity: { gt: 0 } }
				: {};

	// Get service staff: all store staff when no facility, or facility-relevant + staff-without-schedules when facility set
	const serviceStaff = await sqlClient.serviceStaff.findMany({
		where: {
			storeId,
			isDeleted: false,
			...capacityBookingFilter,
			...(serviceStaffIdsToInclude
				? { id: { in: serviceStaffIdsToInclude } }
				: {}),
		},
		include: {
			User: {
				select: {
					id: true,
					name: true,
					email: true,
					phoneNumber: true,
					locale: true,
					timezone: true,
					role: true,
				},
			},
		},
		orderBy: {
			User: {
				name: "asc",
			},
		},
	});

	// Get member roles for all service staff users
	const userIds = serviceStaff.map((ss) => ss.userId);
	const members = store.organizationId
		? await sqlClient.member.findMany({
				where: {
					userId: { in: userIds },
					organizationId: store.organizationId,
				},
				select: {
					userId: true,
					role: true,
				},
			})
		: [];

	const memberRoleMap = new Map<string, string>();
	for (const member of members) {
		memberRoleMap.set(member.userId, member.role);
	}

	// Map service staff to include member role; include owner/staff roles, or the store owner user
	const serviceStaffWithRole = serviceStaff
		.map((ss) => ({
			...ss,
			memberRole: memberRoleMap.get(ss.userId) || "",
		}))
		.filter(
			(ss) =>
				ss.userId === store.ownerId ||
				(ALLOWED_MEMBER_ROLES as readonly string[]).includes(ss.memberRole),
		);

	let columns = serviceStaffWithRole.map(mapServiceStaffToColumn);
	transformPrismaDataForJson(columns);

	if (excludeZeroCapacity && columns.length > 0) {
		const forceInclude = new Set(includeStaffIds);
		columns = columns.filter(
			(ss) => hasPositiveCapacity(ss.capacity) || forceInclude.has(ss.id),
		);
	}

	// When rsvpTimeIso and storeTimezone are provided, filter by staff availability at that time.
	if (rsvpTimeIso && storeTimezone && columns.length > 0) {
		const rsvpDate = new Date(rsvpTimeIso);
		if (!Number.isNaN(rsvpDate.getTime())) {
			const staffIds = columns.map((s) => s.id);
			const businessHoursMap = await getServiceStaffBusinessHoursBatch(
				storeId,
				staffIds,
				facilityId ?? null,
				rsvpDate,
			);
			const includeSet = new Set(includeStaffIds);
			const filtered = columns.filter((staff) => {
				// Always include staff in includeStaffIds (e.g. assigned staff in edit mode)
				if (includeSet.has(staff.id)) return true;
				const hours = businessHoursMap.get(staff.id);
				const { isValid } = checkTimeAgainstBusinessHours(
					hours ?? null,
					rsvpDate,
					storeTimezone,
				);
				return isValid;
			});
			// Add includeStaffIds not already in filtered (e.g. staff no longer available but assigned)
			const filteredIds = new Set(filtered.map((s) => s.id));
			for (const id of includeStaffIds) {
				if (!filteredIds.has(id)) {
					const staff = columns.find((s) => s.id === id);
					if (staff) {
						filtered.push(staff);
						filteredIds.add(id);
					}
				}
			}
			columns = filtered;
		}
	}

	// Sort by userName || userEmail || id (pre-compute keys to avoid O(n log n) redundant string ops)
	const sortKeys = new Map(
		columns.map((s) => [
			s.id,
			(s.userName || s.userEmail || s.id || "").toLowerCase(),
		]),
	);
	columns.sort((a, b) =>
		(sortKeys.get(a.id) ?? "").localeCompare(sortKeys.get(b.id) ?? ""),
	);

	return columns;
}

"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import { mapServiceStaffToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { getT } from "@/app/i18n";
import { MemberRole } from "@/types/enum";
import { getServiceStaffBusinessHoursBatch } from "@/utils/service-staff-schedule-utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";

/** Member roles allowed in service staff list (owner, staff only) */
const ALLOWED_MEMBER_ROLES = [MemberRole.owner, MemberRole.staff] as const;

const getServiceStaffSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
	/** When set, return staff with schedules for facility/default and staff with NO schedules (use StoreSettings.businessHours) */
	facilityId: z.string().optional(),
	/** When set with facilityId, filter staff to those available at this time (ISO string). */
	rsvpTimeIso: z.string().optional(),
	/** Store timezone for time checks (e.g. "Asia/Taipei"). Required when rsvpTimeIso is provided. */
	storeTimezone: z.string().optional(),
});

export const getServiceStaffAction = baseClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ parsedInput }) => {
		const { storeId, facilityId, rsvpTimeIso, storeTimezone } = parsedInput;

		// Verify store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true },
		});

		if (!store) {
			const { t } = await getT();
			throw new SafeError(t("rsvp_store_not_found") || "Store not found");
		}

		// When facilityId is provided: include (a) staff with schedules for facility/default, and (b) staff with NO schedules (use StoreSettings.businessHours)
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
						select: { id: true },
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
			serviceStaffIdsToInclude = [
				...hasFacilityOrDefault,
				...staffWithNoSchedules,
			];
		}

		// Get service staff: all store staff when no facility, or facility-relevant + staff-without-schedules when facility set
		const serviceStaff = await sqlClient.serviceStaff.findMany({
			where: {
				storeId,
				isDeleted: false,
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

		// Create a map for quick lookup
		const memberRoleMap = new Map<string, string>();
		for (const member of members) {
			memberRoleMap.set(member.userId, member.role);
		}

		// Map service staff to include member role; include only owner/staff roles
		const serviceStaffWithRole = serviceStaff
			.map((ss) => ({
				...ss,
				memberRole: memberRoleMap.get(ss.userId) || "",
			}))
			.filter((ss) =>
				(ALLOWED_MEMBER_ROLES as readonly string[]).includes(ss.memberRole),
			);

		// Map to column format
		let serviceStaffColumns = serviceStaffWithRole.map((ss) =>
			mapServiceStaffToColumn(ss),
		);

		transformPrismaDataForJson(serviceStaffColumns);

		// When rsvpTimeIso and storeTimezone provided with facilityId: filter by staff availability at that time
		if (
			facilityId &&
			rsvpTimeIso &&
			storeTimezone &&
			serviceStaffColumns.length > 0
		) {
			const rsvpDate = new Date(rsvpTimeIso);
			if (!Number.isNaN(rsvpDate.getTime())) {
				const staffIds = serviceStaffColumns.map((s) => s.id);
				const businessHoursMap = await getServiceStaffBusinessHoursBatch(
					storeId,
					staffIds,
					facilityId,
					rsvpDate,
				);
				serviceStaffColumns = serviceStaffColumns.filter((staff) => {
					const hours = businessHoursMap.get(staff.id);
					const { isValid } = checkTimeAgainstBusinessHours(
						hours ?? null,
						rsvpDate,
						storeTimezone,
					);
					return isValid;
				});
			}
		}

		// Sort by userName || userEmail || id (pre-compute keys to avoid O(n log n) redundant string ops)
		const sortKeys = new Map(
			serviceStaffColumns.map((s) => [
				s.id,
				(s.userName || s.userEmail || s.id || "").toLowerCase(),
			]),
		);
		serviceStaffColumns.sort((a, b) =>
			(sortKeys.get(a.id) ?? "").localeCompare(sortKeys.get(b.id) ?? ""),
		);

		return { serviceStaff: serviceStaffColumns };
	});

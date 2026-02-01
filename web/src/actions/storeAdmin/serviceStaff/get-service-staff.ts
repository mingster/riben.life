"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getServiceStaffBusinessHours } from "@/utils/service-staff-schedule-utils";
import { checkTimeAgainstBusinessHours } from "@/utils/rsvp-utils";

const getServiceStaffSchema = z.object({
	/** When set, return only service staff that have a ServiceStaffFacilitySchedule for this facility (or default schedule with facilityId null) */
	facilityId: z.string().optional(),
	/** When set with facilityId, filter staff to those available at this time (ISO string). Staff with schedules must be within their ServiceStaffFacilitySchedule hours. */
	rsvpTimeIso: z.string().optional(),
	/** Store timezone for time checks (e.g. "Asia/Taipei"). Required when rsvpTimeIso is provided. */
	storeTimezone: z.string().optional(),
});

export const getServiceStaffAction = storeActionClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const { facilityId, rsvpTimeIso, storeTimezone } = parsedInput;

		// Verify store exists and user has access
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// When facilityId is provided, restrict to staff who have a schedule for this facility or default (facilityId null)
		let serviceStaffIdsForFacility: string[] | null = null;
		if (facilityId) {
			const schedules = await sqlClient.serviceStaffFacilitySchedule.findMany({
				where: {
					storeId,
					isActive: true,
					OR: [{ facilityId }, { facilityId: null }],
				},
				select: { serviceStaffId: true },
				distinct: ["serviceStaffId"],
			});
			serviceStaffIdsForFacility = schedules.map((s) => s.serviceStaffId);
		}

		// Get all service staff for this store with user information (exclude deleted ones)
		const serviceStaff = await sqlClient.serviceStaff.findMany({
			where: {
				storeId,
				isDeleted: false,
				...(serviceStaffIdsForFacility
					? { id: { in: serviceStaffIdsForFacility } }
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

		// Map service staff to include member role
		const serviceStaffWithRole = serviceStaff.map((ss) => ({
			...ss,
			memberRole: memberRoleMap.get(ss.userId) || "",
		}));

		transformPrismaDataForJson(serviceStaffWithRole);

		// Map to ServiceStaffColumn format
		const { mapServiceStaffToColumn } = await import(
			"@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column"
		);
		const mappedServiceStaff = serviceStaffWithRole.map(
			mapServiceStaffToColumn,
		);

		// When rsvpTimeIso and storeTimezone provided with facilityId: filter by staff availability at that time
		let filteredByTime = mappedServiceStaff;
		if (
			facilityId &&
			rsvpTimeIso &&
			storeTimezone &&
			mappedServiceStaff.length > 0
		) {
			const rsvpDate = new Date(rsvpTimeIso);
			if (!Number.isNaN(rsvpDate.getTime())) {
				const staffAvailableAtTime: typeof mappedServiceStaff = [];
				for (const staff of mappedServiceStaff) {
					const staffBusinessHours = await getServiceStaffBusinessHours(
						storeId,
						staff.id,
						facilityId,
						rsvpDate,
					);
					const result = checkTimeAgainstBusinessHours(
						staffBusinessHours,
						rsvpDate,
						storeTimezone,
					);
					if (result.isValid) {
						staffAvailableAtTime.push(staff);
					}
				}
				filteredByTime = staffAvailableAtTime;
			}
		}

		// Sort by userName || userEmail || id (same logic as client-side)
		filteredByTime.sort((a, b) => {
			const nameA = (a.userName || a.userEmail || a.id || "").toLowerCase();
			const nameB = (b.userName || b.userEmail || b.id || "").toLowerCase();
			return nameA.localeCompare(nameB);
		});

		return { serviceStaff: filteredByTime };
	});

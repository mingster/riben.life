"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { baseClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import { mapServiceStaffToColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { getT } from "@/app/i18n";

const getServiceStaffSchema = z.object({
	storeId: z.string().min(1, "Store ID is required"),
});

export const getServiceStaffAction = baseClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

		// Verify store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true },
		});

		if (!store) {
			const { t } = await getT();
			throw new SafeError(t("rsvp_store_not_found") || "Store not found");
		}

		// Get all service staff for this store with user information (exclude deleted ones)
		const serviceStaff = await sqlClient.serviceStaff.findMany({
			where: {
				storeId,
				isDeleted: false,
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

		// Map to column format
		const serviceStaffColumns = serviceStaffWithRole.map((ss) =>
			mapServiceStaffToColumn(ss),
		);

		transformPrismaDataForJson(serviceStaffColumns);

		// Sort by userName || userEmail || id (same logic as client-side)
		serviceStaffColumns.sort((a, b) => {
			const nameA = (a.userName || a.userEmail || a.id || "").toLowerCase();
			const nameB = (b.userName || b.userEmail || b.id || "").toLowerCase();
			return nameA.localeCompare(nameB);
		});

		return { serviceStaff: serviceStaffColumns };
	});

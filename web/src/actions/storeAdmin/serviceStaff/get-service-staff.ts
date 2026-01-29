"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import { Prisma } from "@prisma/client";

const getServiceStaffSchema = z.object({});

export const getServiceStaffAction = storeActionClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		// Verify store exists and user has access, also get ownerId
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true, ownerId: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
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

		// Get member roles for all service staff users and owner
		const userIds = serviceStaff.map((ss) => ss.userId);
		// Include ownerId if not already in the list
		const allUserIds = store.ownerId
			? [...new Set([...userIds, store.ownerId])]
			: userIds;

		const members = store.organizationId
			? await sqlClient.member.findMany({
					where: {
						userId: { in: allUserIds },
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

		// Check if owner is already in the service staff list
		const ownerInServiceStaff = store.ownerId
			? serviceStaffWithRole.some((ss) => ss.userId === store.ownerId)
			: false;

		// If owner is not in service staff list, add them
		if (store.ownerId && !ownerInServiceStaff) {
			// Fetch owner user information
			const owner = await sqlClient.user.findUnique({
				where: { id: store.ownerId },
				select: {
					id: true,
					name: true,
					email: true,
					phoneNumber: true,
					locale: true,
					timezone: true,
					role: true,
				},
			});

			if (owner) {
				// Create synthetic service staff entry for owner
				const ownerServiceStaff = {
					id: `owner-${store.ownerId}`, // Synthetic ID to identify owner
					storeId: storeId,
					userId: store.ownerId,
					capacity: 0, // Default value
					defaultCost: new Prisma.Decimal(0), // Default value
					defaultCredit: new Prisma.Decimal(0), // Default value
					defaultDuration: 60, // Default value
					businessHours: null,
					description: null,
					receiveStoreNotifications: true,
					isDeleted: false,
					User: owner,
					memberRole: memberRoleMap.get(store.ownerId) || "owner",
				};

				// Add owner to the list
				serviceStaffWithRole.push(ownerServiceStaff);
			}
		}

		transformPrismaDataForJson(serviceStaffWithRole);

		// Map to ServiceStaffColumn format
		const { mapServiceStaffToColumn } = await import(
			"@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column"
		);
		const mappedServiceStaff = serviceStaffWithRole.map(
			mapServiceStaffToColumn,
		);

		// Sort by userName || userEmail || id (same logic as client-side)
		mappedServiceStaff.sort((a, b) => {
			const nameA = (a.userName || a.userEmail || a.id || "").toLowerCase();
			const nameB = (b.userName || b.userEmail || b.id || "").toLowerCase();
			return nameA.localeCompare(nameB);
		});

		return { serviceStaff: mappedServiceStaff };
	});

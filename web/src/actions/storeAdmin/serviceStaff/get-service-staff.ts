"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";

const getServiceStaffSchema = z.object({});

export const getServiceStaffAction = storeActionClient
	.metadata({ name: "getServiceStaff" })
	.schema(getServiceStaffSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		// Verify store exists and user has access
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true, organizationId: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Get all service staff for this store with user information
		const serviceStaff = await sqlClient.serviceStaff.findMany({
			where: { storeId },
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

		return { serviceStaff: serviceStaffWithRole };
	});

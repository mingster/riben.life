"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getCustomersSchema } from "./get-customers.validation";
import { MemberRole } from "@/types/enum";
import { computeCustomerStoreStatsFromRelations } from "@/actions/storeAdmin/store-admin/compute-customer-store-stats";
import { type Prisma } from "@prisma/client";

/** Serialized customer row for the store admin list (stats + member role). */
export type CustomerListEntry = User & {
	memberRole: string;
	customerCreditFiat: number;
	customerCreditPoint: number;
	totalSpending: number;
	completedReservations: number;
};

const customerListArgs = {
	include: {
		sessions: true,
		members: true,
		Orders: {
			select: {
				orderTotal: true,
				orderStatus: true,
			},
		},
		Reservations: {
			select: {
				status: true,
			},
		},
	},
} satisfies Prisma.UserDefaultArgs;

// consume storeActionClient to ensure user is a member of the store
export const getCustomersAction = storeActionClient
	.metadata({ name: "getCustomers" })
	.schema(getCustomersSchema)
	.action(async ({ ctx, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		const store = await sqlClient.store.findUnique({
			where: {
				id: storeId,
			},
			select: {
				organizationId: true,
			},
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		const organizationId = store.organizationId;
		if (!organizationId) {
			return {
				users: [] as CustomerListEntry[],
			};
		}

		// Get all member users in the organization
		const members = await sqlClient.member.findMany({
			where: {
				organizationId,
				role: MemberRole.customer,
			},
		});

		if (members.length === 0) {
			return {
				users: [] as CustomerListEntry[],
			};
		}

		const users = await sqlClient.user.findMany({
			where: {
				id: {
					in: members.map((member) => member.userId),
				},
			},
			include: {
				...customerListArgs.include,
				Orders: {
					where: {
						storeId: storeId,
					},
					select: {
						orderTotal: true,
						orderStatus: true,
					},
				},
				Reservations: {
					where: {
						storeId: storeId,
					},
					select: {
						status: true,
					},
				},
			},
		});

		// Get CustomerCredit records for all users (credit is now cross-store)
		const userIds = users.map((user) => user.id);
		const customerCredits = await sqlClient.customerCredit.findMany({
			where: {
				userId: {
					in: userIds,
				},
			},
		});

		// Create a map for quick lookup
		const creditMap = new Map<string, (typeof customerCredits)[0]>();
		customerCredits.forEach((credit) => {
			creditMap.set(credit.userId, credit);
		});

		// Map users to include the member role, customer credit, and calculated stats
		const usersWithRole: CustomerListEntry[] = users.map((user) => {
			const membersList = user.members as
				| Array<{ organizationId: string; role: string }>
				| undefined;
			const member = membersList?.find(
				(m) => m.organizationId === organizationId,
			);
			const customerCredit = creditMap.get(user.id);

			const stats = computeCustomerStoreStatsFromRelations(
				user.Orders,
				user.Reservations,
				customerCredit ?? null,
			);

			return {
				...user,
				memberRole: member?.role || "",
				...stats,
			} as CustomerListEntry;
		});

		transformPrismaDataForJson(usersWithRole);

		return {
			users: usersWithRole,
		};
	});

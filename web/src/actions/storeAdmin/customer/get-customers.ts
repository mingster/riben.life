"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getCustomersSchema } from "./get-customers.validation";

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

		if (!store.organizationId) {
			return {
				users: [] as User[],
			};
		}

		// Get all member users in the organization
		const members = await sqlClient.member.findMany({
			where: {
				organizationId: store.organizationId,
			},
		});

		if (members.length === 0) {
			return {
				users: [] as User[],
			};
		}

		const users = (await sqlClient.user.findMany({
			where: {
				id: {
					in: members.map((member) => member.userId),
				},
			},
			include: {
				sessions: true,
				members: true,
			},
		})) as User[];

		// Get CustomerCredit records for all users in this store
		const userIds = users.map((user) => user.id);
		const customerCredits = await sqlClient.customerCredit.findMany({
			where: {
				storeId,
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

		// Map users to include the member role and customer credit for this organization
		const usersWithRole = users.map((user) => {
			const member = user.members.find(
				(m: { organizationId: string; role: string }) =>
					m.organizationId === store.organizationId,
			);
			const customerCredit = creditMap.get(user.id);
			return {
				...user,
				memberRole: member?.role || "",
				customerCreditFiat: customerCredit ? Number(customerCredit.fiat) : 0,
				customerCreditPoint: customerCredit ? Number(customerCredit.point) : 0,
			} as User & {
				memberRole: string;
				customerCreditFiat: number;
				customerCreditPoint: number;
			};
		});

		transformPrismaDataForJson(usersWithRole);

		return {
			users: usersWithRole,
		};
	});

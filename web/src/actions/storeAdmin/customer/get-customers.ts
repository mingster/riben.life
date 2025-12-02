"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import type { User } from "@/types";
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

		// Map users to include the member role for this organization
		const usersWithRole = users.map((user) => {
			const member = user.members.find(
				(m: { organizationId: string; role: string }) =>
					m.organizationId === store.organizationId,
			);
			return {
				...user,
				memberRole: member?.role || "",
			} as User & { memberRole: string };
		});

		return {
			users: usersWithRole,
		};
	});

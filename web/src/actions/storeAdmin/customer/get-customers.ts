"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import type { User } from "@/types";
import { getCustomersSchema } from "./get-customers.validation";

export const getCustomersAction = storeActionClient
	.metadata({ name: "getCustomers" })
	.schema(getCustomersSchema)
	.action(async ({ parsedInput }) => {
		const { storeId } = parsedInput;

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
			},
		})) as User[];

		return {
			users,
		};
	});

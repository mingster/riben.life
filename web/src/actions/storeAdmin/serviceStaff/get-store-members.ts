"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { z } from "zod";
import { transformPrismaDataForJson } from "@/utils/utils";
import type { User } from "@/types";

const getStoreMembersSchema = z.object({});

export const getStoreMembersAction = storeActionClient
	.metadata({ name: "getStoreMembers" })
	.schema(getStoreMembersSchema)
	.action(async ({ bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;

		// Verify store exists and get organization
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { organizationId: true },
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
			select: {
				id: true,
				name: true,
				email: true,
				phoneNumber: true,
			},
			orderBy: {
				name: "asc",
			},
		})) as User[];

		transformPrismaDataForJson(users);

		return { users };
	});

"use server";

import { updateCustomerSchema } from "./update-customer.validation";
import { sqlClient } from "@/lib/prismadb";
import { storeActionClient } from "@/utils/actions/safe-action";
import { getUtcNow } from "@/utils/datetime-utils";
import crypto from "crypto";

export const updateCustomerAction = storeActionClient
	.metadata({ name: "updateCustomer" })
	.schema(updateCustomerSchema)
	.action(
		async ({
			ctx: {},
			parsedInput: {
				storeId,
				customerId,
				name,
				locale,
				timezone,
				phone,
				email,
			},
		}) => {
			// Get organizationId from store
			const store = await sqlClient.store.findUnique({
				where: { id: storeId },
				select: { organizationId: true },
			});

			if (!store || !store.organizationId) {
				throw new Error("Store organization not found");
			}

			// Update user
			await sqlClient.user.update({
				where: { id: customerId },
				data: {
					name,
					locale,
					timezone,
					phoneNumber: phone,
					email: email && email.trim() !== "" ? email : null,
				},
			});

			const organizationId = store.organizationId;

			// Update or create member role
			const existingMember = await sqlClient.member.findFirst({
				where: {
					userId: customerId,
					organizationId: organizationId,
				},
			});

			// Always set role to "customer" for customers managed in this section
			const memberRole = "customer";

			if (existingMember) {
				// Update existing member
				await sqlClient.member.update({
					where: { id: existingMember.id },
					data: { role: memberRole },
				});
			} else {
				// Create new member
				await sqlClient.member.create({
					data: {
						id: crypto.randomUUID(),
						userId: customerId,
						organizationId: organizationId,
						role: memberRole,
						createdAt: getUtcNow(),
					},
				});
			}
		},
	);

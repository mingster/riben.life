"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getCustomersSchema } from "./get-customers.validation";
import { MemberRole, OrderStatus, RsvpStatus } from "@/types/enum";
import { Prisma } from "@prisma/client";

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
				role: MemberRole.customer,
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
		})) as User[];

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
		const usersWithRole = users.map((user) => {
			const member = user.members.find(
				(m: { organizationId: string; role: string }) =>
					m.organizationId === store.organizationId,
			);
			const customerCredit = creditMap.get(user.id);

			// Calculate total spending: completed/confirmed orders minus refunded orders
			let totalSpending = 0;
			const orders = (user as any).Orders || [];
			orders.forEach(
				(order: {
					orderTotal: number | bigint | Prisma.Decimal;
					orderStatus: number;
				}) => {
					const status = order.orderStatus;
					const orderTotal = Number(order.orderTotal) || 0;

					if (
						status === Number(OrderStatus.Completed) ||
						status === Number(OrderStatus.Confirmed)
					) {
						totalSpending += orderTotal;
					} else if (status === Number(OrderStatus.Refunded)) {
						totalSpending -= orderTotal;
					}
				},
			);

			// Count completed reservations
			const reservations = (user as any).Reservations || [];
			const completedReservations = reservations.filter(
				(reservation: { status: number }) =>
					reservation.status === Number(RsvpStatus.Completed),
			).length;

			return {
				...user,
				memberRole: member?.role || "",
				customerCreditFiat: customerCredit ? Number(customerCredit.fiat) : 0,
				customerCreditPoint: customerCredit ? Number(customerCredit.point) : 0,
				totalSpending,
				completedReservations,
			} as User & {
				memberRole: string;
				customerCreditFiat: number;
				customerCreditPoint: number;
				totalSpending: number;
				completedReservations: number;
			};
		});

		transformPrismaDataForJson(usersWithRole);

		return {
			users: usersWithRole,
		};
	});

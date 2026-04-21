"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getCustomersSchema } from "./get-customers.validation";
import { MemberRole, OrderStatus, RsvpStatus } from "@/types/enum";
import { type Prisma } from "@prisma/client";

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
				users: [] as User[],
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
				users: [] as User[],
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
		const usersWithRole = users.map((user) => {
			const membersList = user.members as
				| Array<{ organizationId: string; role: string }>
				| undefined;
			const member = membersList?.find(
				(m) => m.organizationId === organizationId,
			);
			const customerCredit = creditMap.get(user.id);

			// Calculate total spending: completed/confirmed orders minus refunded orders
			let totalSpending = 0;
			const orders = (user.Orders ?? []) as Array<{
				orderTotal: number | bigint | Prisma.Decimal;
				orderStatus: number;
			}>;
			orders.forEach((order) => {
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
			});

			// Count completed reservations
			const reservations = (user.Reservations ?? []) as Array<{
				status: number;
			}>;
			const completedReservations = reservations.filter(
				(reservation) => reservation.status === Number(RsvpStatus.Completed),
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

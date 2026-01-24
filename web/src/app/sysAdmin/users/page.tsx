"use server";

import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import type { User } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";
import { OrderStatus, RsvpStatus } from "@/types/enum";
import { Prisma } from "@prisma/client";
import { Suspense } from "react";
import { UsersClient } from "./components/client-user";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function UsersAdminPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const users = (await sqlClient.user.findMany({
		include: {
			sessions: true,
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
			CustomerCredit: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	})) as User[];

	// Map users to include totalSpending, completedReservations, customerCreditFiat, customerCreditPoint (same logic as get-customers, cross-store)
	const usersWithStats = users.map((user) => {
		const customerCredit = (user as any).CustomerCredit;
		const orders = (user as any).Orders || [];
		const reservations = (user as any).Reservations || [];

		// Total spending: completed/confirmed orders minus refunded (across all stores)
		let totalSpending = 0;
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

		// Completed reservations (across all stores)
		const completedReservations = reservations.filter(
			(r: { status: number }) => r.status === Number(RsvpStatus.Completed),
		).length;

		const { Orders: _o, Reservations: _r, CustomerCredit: _c, ...rest } = user as any;
		return {
			...rest,
			customerCreditFiat: customerCredit ? Number(customerCredit.fiat) : 0,
			customerCreditPoint: customerCredit ? Number(customerCredit.point) : 0,
			totalSpending,
			completedReservations,
		} as User & {
			customerCreditFiat: number;
			customerCreditPoint: number;
			totalSpending: number;
			completedReservations: number;
		};
	});

	// Transform BigInt (epoch timestamps) and Decimal to numbers for JSON serialization
	transformPrismaDataForJson(usersWithStats);

	return (
		<Suspense fallback={<Loader />}>
			<UsersClient serverData={usersWithStats} />
		</Suspense>
	);
}

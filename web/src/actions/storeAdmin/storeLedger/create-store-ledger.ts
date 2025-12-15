"use server";

import { sqlClient } from "@/lib/prismadb";
import { SafeError } from "@/utils/error";
import { storeActionClient } from "@/utils/actions/safe-action";
import { Prisma } from "@prisma/client";
import { transformPrismaDataForJson } from "@/utils/utils";
import { getUtcNowEpoch } from "@/utils/datetime-utils";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createStoreLedgerSchema } from "./create-store-ledger.validation";
import logger from "@/lib/logger";

export const createStoreLedgerAction = storeActionClient
	.metadata({ name: "createStoreLedger" })
	.schema(createStoreLedgerSchema)
	.action(async ({ parsedInput, bindArgsClientInputs }) => {
		const storeId = bindArgsClientInputs[0] as string;
		const {
			orderId,
			amount,
			fee,
			platformFee,
			currency,
			type,
			description,
			note,
			availability,
		} = parsedInput;

		// Verify store exists
		const store = await sqlClient.store.findUnique({
			where: { id: storeId },
			select: { id: true },
		});

		if (!store) {
			throw new SafeError("Store not found");
		}

		// Verify order exists
		const order = await sqlClient.storeOrder.findUnique({
			where: { id: orderId },
			select: { id: true, storeId: true },
		});

		if (!order) {
			throw new SafeError("Order not found");
		}

		if (order.storeId !== storeId) {
			throw new SafeError("Order does not belong to this store");
		}

		// Get current user ID for createdBy field
		const session = await auth.api.getSession({
			headers: await headers(),
		});
		const createdBy = session?.user?.id || null;

		// Get last ledger balance
		const lastLedger = await sqlClient.storeLedger.findFirst({
			where: { storeId },
			orderBy: { createdAt: "desc" },
			take: 1,
		});

		const balance = Number(lastLedger ? lastLedger.balance : 0);
		const newBalance =
			balance + Number(amount) + Number(fee) + Number(platformFee);

		// Use provided availability or default to now
		const availabilityDate = availability
			? BigInt(availability)
			: getUtcNowEpoch();

		try {
			const storeLedger = await sqlClient.storeLedger.create({
				data: {
					storeId,
					orderId,
					amount: new Prisma.Decimal(amount),
					fee: new Prisma.Decimal(fee),
					platformFee: new Prisma.Decimal(platformFee),
					currency: currency.toLowerCase(),
					type,
					balance: new Prisma.Decimal(newBalance),
					description,
					note: note || null,
					createdBy: createdBy || null,
					availability: availabilityDate,
					createdAt: getUtcNowEpoch(),
				},
				include: {
					StoreOrder: true,
					CreatedBy: {
						select: {
							id: true,
							name: true,
							email: true,
						},
					},
				},
			});

			logger.info("StoreLedger entry created", {
				metadata: {
					storeLedgerId: storeLedger.id,
					storeId,
					orderId,
					amount: Number(amount),
					type,
					balanceBefore: balance,
					balanceAfter: newBalance,
				},
				tags: ["store-ledger", "create"],
			});

			const transformedLedger = { ...storeLedger };
			transformPrismaDataForJson(transformedLedger);

			return {
				storeLedger: transformedLedger,
			};
		} catch (error: unknown) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				throw new SafeError("StoreLedger entry already exists.");
			}

			throw error;
		}
	});

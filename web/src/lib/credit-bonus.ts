import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";

/**
 * Calculate bonus points based on top-up amount and store rules.
 * Uses a "highest matching threshold" strategy.
 * @param storeId
 * @param amount
 * @returns bonus amount
 */
export async function calculateBonus(
	storeId: string,
	amount: number,
): Promise<number> {
	const rules = await sqlClient.creditBonusRule.findMany({
		where: {
			storeId,
			isActive: true,
		},
		orderBy: {
			threshold: "desc",
		},
	});

	// Find the highest threshold that the amount meets
	for (const rule of rules) {
		if (amount >= Number(rule.threshold)) {
			return Number(rule.bonus);
		}
	}

	return 0;
}

/**
 * Process a credit top-up, calculate bonus, update balance, and log transactions.
 * @param storeId
 * @param userId
 * @param amount Top-up amount
 * @param referenceId Order ID or Payment ID
 */
export async function processCreditTopUp(
	storeId: string,
	userId: string,
	amount: number,
	referenceId?: string,
) {
	const bonus = await calculateBonus(storeId, amount);
	const totalCredit = amount + bonus;

	await sqlClient.$transaction(async (tx) => {
		// 1. Update CustomerCredit
		const customerCredit = await tx.customerCredit.upsert({
			where: {
				storeId_userId: {
					storeId,
					userId,
				},
			},
			update: {
				credit: {
					increment: totalCredit,
				},
			},
			create: {
				storeId,
				userId,
				credit: totalCredit,
			},
		});

		const finalBalance = Number(customerCredit.credit);
		const balanceAfterTopUp = finalBalance - bonus;

		// 2. Create Log for Top-up
		await tx.customerCreditLedger.create({
			data: {
				storeId,
				userId,
				amount: new Prisma.Decimal(amount),
				balance: new Prisma.Decimal(balanceAfterTopUp),
				type: "TOPUP",
				referenceId,
				note: `Top-up ${amount}`,
			},
		});

		// 3. Create Log for Bonus if any
		if (bonus > 0) {
			await tx.customerCreditLedger.create({
				data: {
					storeId,
					userId,
					amount: new Prisma.Decimal(bonus),
					balance: new Prisma.Decimal(finalBalance),
					type: "BONUS",
					referenceId,
					note: `Bonus for top-up ${amount}`,
				},
			});
		}
	});

	return { amount, bonus, totalCredit };
}

import { sqlClient } from "@/lib/prismadb";
import { Prisma } from "@prisma/client";
import { CustomerCreditLedgerType } from "@/types/enum";
import { getUtcNowEpoch } from "@/utils/datetime-utils";

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
 *
 * This function handles both:
 * - Customer refills (via payment): referenceId should be StoreOrder.id, creatorId should be null
 * - Store operator refills (manual): referenceId should be null, creatorId should be operator's userId
 *
 * @param storeId - Store ID
 * @param userId - Customer user ID
 * @param amount - Top-up amount (must be positive)
 * @param referenceId - Order ID for customer refill, or null for manual refill
 * @param creatorId - User ID of operator who created this refill (null for customer-initiated)
 * @param note - Optional note/description for the transaction
 * @returns Object with amount, bonus, and totalCredit
 */
export async function processCreditTopUp(
	storeId: string,
	userId: string,
	amount: number,
	referenceId?: string | null,
	creatorId?: string | null,
	note?: string | null,
): Promise<{
	success: boolean;
	amount: number;
	bonus: number;
	totalCredit: number;
}> {
	if (amount <= 0) {
		//		throw new Error("Top-up amount must be positive");
		return { success: false, amount: 0, bonus: 0, totalCredit: 0 };
	}

	// Calculate bonus based on top-up amount
	const bonus = await calculateBonus(storeId, amount);
	const totalCredit = amount + bonus;

	await sqlClient.$transaction(async (tx) => {
		// 1. Get current balance (before update)
		const existingCredit = await tx.customerCredit.findUnique({
			where: {
				userId,
			},
		});

		const currentBalance = existingCredit ? Number(existingCredit.point) : 0;
		const balanceAfterTopUp = currentBalance + amount;
		const finalBalance = balanceAfterTopUp + bonus;

		// 2. Update CustomerCredit
		const customerCredit = await tx.customerCredit.upsert({
			where: {
				userId,
			},
			update: {
				point: {
					increment: totalCredit,
				},
			},
			create: {
				userId,
				point: totalCredit,
				updatedAt: getUtcNowEpoch(),
			},
		});

		// Verify the balance matches our calculation
		const actualBalance = Number(customerCredit.point);
		if (Math.abs(actualBalance - finalBalance) > 0.01) {
			throw new Error(
				`Balance mismatch: expected ${finalBalance}, got ${actualBalance}`,
			);
		}

		// 3. Create Ledger Entry for Top-up
		await tx.customerCreditLedger.create({
			data: {
				storeId,
				userId,
				amount: new Prisma.Decimal(amount),
				createdAt: getUtcNowEpoch(),
				balance: new Prisma.Decimal(balanceAfterTopUp),
				type: CustomerCreditLedgerType.Topup,
				referenceId: referenceId || null,
				note: note || `Top-up ${amount}`,
				creatorId: creatorId || null,
			},
		});

		// 4. Create Ledger Entry for Bonus if applicable
		if (bonus > 0) {
			await tx.customerCreditLedger.create({
				data: {
					storeId,
					userId,
					amount: new Prisma.Decimal(bonus),
					balance: new Prisma.Decimal(finalBalance),
					type: CustomerCreditLedgerType.Bonus,
					referenceId: referenceId || null,
					note: `Bonus for top-up ${amount}`,
					creatorId: null, // Bonus is always system-generated
					createdAt: getUtcNowEpoch(),
				},
			});
		}
	});

	return { success: true, amount, bonus, totalCredit };
}

/**
 * Process a fiat top-up, update balance, and log transaction.
 *
 * This function handles both:
 * - Customer refills (via payment): referenceId should be StoreOrder.id, creatorId should be null
 * - Store operator refills (manual): referenceId should be null, creatorId should be operator's userId
 *
 * @param storeId - Store ID
 * @param userId - Customer user ID
 * @param amount - Top-up amount (must be positive)
 * @param referenceId - Order ID for customer refill, or null for manual refill
 * @param creatorId - User ID of operator who created this refill (null for customer-initiated)
 * @param note - Optional note/description for the transaction
 * @returns Object with success status and amount
 */
export async function processFiatTopUp(
	storeId: string,
	userId: string,
	amount: number,
	referenceId?: string | null,
	creatorId?: string | null,
	note?: string | null,
): Promise<{
	success: boolean;
	amount: number;
}> {
	if (amount <= 0) {
		return { success: false, amount: 0 };
	}

	await sqlClient.$transaction(async (tx) => {
		// 1. Get current balance (before update)
		const existingCredit = await tx.customerCredit.findUnique({
			where: {
				userId,
			},
		});

		const currentBalance = existingCredit ? Number(existingCredit.fiat) : 0;
		const newBalance = currentBalance + amount;

		// 2. Update CustomerCredit (fiat field)
		const customerCredit = await tx.customerCredit.upsert({
			where: {
				userId,
			},
			update: {
				fiat: {
					increment: amount,
				},
				updatedAt: getUtcNowEpoch(),
			},
			create: {
				userId,
				fiat: new Prisma.Decimal(amount),
				point: new Prisma.Decimal(0), // Ensure point is set
				updatedAt: getUtcNowEpoch(),
			},
		});

		// Verify the balance matches our calculation
		const actualBalance = Number(customerCredit.fiat);
		if (Math.abs(actualBalance - newBalance) > 0.01) {
			throw new Error(
				`Balance mismatch: expected ${newBalance}, got ${actualBalance}`,
			);
		}

		// 3. Create CustomerFiatLedger Entry for Top-up
		await tx.customerFiatLedger.create({
			data: {
				storeId,
				userId,
				amount: new Prisma.Decimal(amount),
				balance: new Prisma.Decimal(newBalance),
				type: CustomerCreditLedgerType.Topup,
				referenceId: referenceId || null,
				note: note || `Top-up ${amount}`,
				creatorId: creatorId || null,
				createdAt: getUtcNowEpoch(),
			},
		});
	});

	return { success: true, amount };
}

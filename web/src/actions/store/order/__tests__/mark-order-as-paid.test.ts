import { beforeEach, describe, expect, mock, test } from "bun:test";

class DecimalMock {
	private readonly value: number;

	constructor(value: number | string) {
		this.value = Number(value);
	}

	toNumber(): number {
		return this.value;
	}

	valueOf(): number {
		return this.value;
	}
}

mock.module("@prisma/client", () => ({
	Prisma: {
		Decimal: DecimalMock,
	},
}));

mock.module("@/utils/error", () => ({
	SafeError: class SafeError extends Error {},
}));

mock.module("@/utils/utils", () => ({
	transformPrismaDataForJson: () => undefined,
}));

mock.module("@/utils/datetime-utils", () => ({
	epochToDate: (epoch: bigint | number | null | undefined) =>
		epoch == null ? null : new Date(Number(epoch)),
	getUtcNowEpoch: () => BigInt(1_700_000_100_000),
}));

const createdOrderNotes: unknown[] = [];
const createdStoreLedgers: unknown[] = [];

const order = {
	id: "order_1",
	storeId: "store_1",
	orderNum: 1001,
	isPaid: false,
	orderTotal: new DecimalMock(100),
	currency: "twd",
	updatedAt: BigInt(1_700_000_000_000),
	checkoutAttributes: "",
	Store: {
		id: "store_1",
		level: 1,
		paymentCredentials: null,
	},
	PaymentMethod: {
		id: "pm_1",
		name: "Cash",
		fee: new DecimalMock(0),
		feeAdditional: new DecimalMock(0),
		clearDays: 0,
	},
	OrderItemView: [],
};

mock.module("@/app/i18n", () => ({
	getT: async () => ({ t: (key: string) => key }),
}));

mock.module("@/lib/logger", () => ({
	default: {
		info: () => undefined,
		warn: () => undefined,
		error: () => undefined,
	},
}));

mock.module("@/lib/prismadb", () => ({
	sqlClient: {
		paymentMethod: {
			findUnique: async () => order.PaymentMethod,
		},
		storeLedger: {
			findFirst: async () => null,
		},
		rsvp: {
			findFirst: async () => null,
		},
		storeOrder: {
			findUnique: async () => ({ ...order, isPaid: true }),
		},
		$transaction: async (callback: (tx: TransactionMock) => Promise<void>) =>
			callback(transactionMock),
	},
}));

interface TransactionMock {
	storeOrder: {
		update: () => Promise<void>;
		updateMany: () => Promise<{ count: number }>;
	};
	orderNote: {
		create: (input: unknown) => Promise<void>;
	};
	storeLedger: {
		create: (input: unknown) => Promise<void>;
	};
}

const transactionMock: TransactionMock = {
	storeOrder: {
		update: async () => undefined,
		updateMany: async () => ({ count: 0 }),
	},
	orderNote: {
		create: async (input: unknown) => {
			createdOrderNotes.push(input);
		},
	},
	storeLedger: {
		create: async (input: unknown) => {
			createdStoreLedgers.push(input);
		},
	},
};

const { markOrderAsPaidCore } = await import(
	"@/lib/shop/mark-order-as-paid-core"
);

describe("markOrderAsPaidCore", () => {
	beforeEach(() => {
		createdOrderNotes.length = 0;
		createdStoreLedgers.length = 0;
	});

	test("skips note and ledger side effects when another caller already claimed the order", async () => {
		const result = await markOrderAsPaidCore({
			order,
			paymentMethodId: "pm_1",
			isPro: true,
		});

		expect(result.didMarkOrderAsPaid).toBe(false);
		expect(createdOrderNotes).toHaveLength(0);
		expect(createdStoreLedgers).toHaveLength(0);
	});
});

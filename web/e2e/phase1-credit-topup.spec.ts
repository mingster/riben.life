import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "./fixtures/reservation.fixture";

const AUTH_META_PATH = join(process.cwd(), "e2e", ".auth", "meta.json");

function readMeta(): { userId: string } {
	return JSON.parse(readFileSync(AUTH_META_PATH, "utf-8")) as { userId: string };
}

test.describe("Phase 1 - service package credit top-up", () => {
	test("@phase1 isCreditTopUp product purchase credits customer balance by 5000", async ({
		request,
		store,
	}) => {
		const { userId } = readMeta();

		const response = await request.post("/api/e2e/phase1-credit-topup", {
			data: {
				storeId: store.storeId,
				userId,
				topUpAmount: 5000,
			},
		});

		expect(response.ok()).toBeTruthy();

		const body = (await response.json()) as {
			detectedAsCreditRefill: boolean;
			pointDelta: number;
			expectedDelta: number;
			beforePoint: number;
			afterPoint: number;
		};

		expect(body.detectedAsCreditRefill).toBeTruthy();
		expect(body.pointDelta).toBe(body.expectedDelta);
		expect(body.afterPoint - body.beforePoint).toBe(5000);
	});
});

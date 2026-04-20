import type { Currency } from "@/lib/payment/linePay/line-pay-api/type";

const LINE_PAY_CURRENCIES = new Set(["USD", "JPY", "TWD", "THB"]);

export function toLinePayCurrency(currency: string): Currency | null {
	const u = currency.trim().toUpperCase();
	if (LINE_PAY_CURRENCIES.has(u)) {
		return u as Currency;
	}
	return null;
}

export function roundMoney(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100) / 100;
}

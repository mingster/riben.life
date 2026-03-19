/**
 * Builds a LINE "add friend" URL from store contact LINE ID or an existing URL.
 */
export function buildLineAddFriendUrl(
	lineId: string | null | undefined,
): string | null {
	if (!lineId?.trim()) {
		return null;
	}
	const s = lineId.trim();
	if (/^https?:\/\//i.test(s)) {
		return s;
	}
	const basicId = s.startsWith("@") ? s.slice(1) : s;
	if (!basicId) {
		return null;
	}
	return `https://line.me/R/ti/p/@${basicId}`;
}

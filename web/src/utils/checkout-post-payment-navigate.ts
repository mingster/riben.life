import type { StoreOrder } from "@/types";

type AppRouterLike = { push: (href: string) => void };

/**
 * Navigates after checkout success: respects `returnUrl`, then logged-in users go to
 * account order detail; guests go to the store (matches checkout cancel URL behavior).
 */
export function navigateAfterCheckout(
	router: AppRouterLike,
	params: {
		orderId: string;
		order?: Pick<StoreOrder, "userId" | "storeId"> | null;
		returnUrl?: string;
	},
): void {
	const { orderId, order, returnUrl } = params;

	if (returnUrl) {
		if (
			returnUrl.startsWith("http://") ||
			returnUrl.startsWith("https://")
		) {
			try {
				const u = new URL(returnUrl);
				if (
					typeof window !== "undefined" &&
					u.origin === window.location.origin
				) {
					router.push(`${u.pathname}${u.search}${u.hash}`);
					return;
				}
			} catch {
				/* fall through to full navigation */
			}
			if (typeof window !== "undefined") {
				window.location.href = returnUrl;
			}
			return;
		}
		router.push(returnUrl);
		return;
	}

	if (order?.userId) {
		router.push(`/account/orders/${orderId}`);
		return;
	}

	if (order?.storeId) {
		router.push(`/s/${order.storeId}`);
		return;
	}

	router.push(`/account/orders/${orderId}`);
}

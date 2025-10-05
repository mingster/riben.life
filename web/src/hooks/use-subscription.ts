import { useState, useCallback } from "react";
import { clientLogger } from "@/lib/client-logger";
import type { NopOrder, NopProductVariant, User } from "@/types";
import type Stripe from "stripe";

interface OrderData {
	productToPurchase: NopProductVariant;
	user: User;
	coupon?: Stripe.Coupon | null;
}

export const useSubscription = () => {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const placeOrder = useCallback(
		async (orderData: OrderData): Promise<NopOrder | null> => {
			setLoading(true);
			setError(null);

			try {
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL}/payment/stripe/create-pending-order`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(orderData),
					},
				);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const data = await response.json();
				return data as NopOrder;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to place order";
				setError(message);
				clientLogger.error(`Failed to place order: ${message}`, {
					metadata: { orderData },
					tags: ["placeOrder"],
					service: "use-subscription",
					environment: process.env.NODE_ENV,
					version: process.env.npm_package_version,
				});
				return null;
			} finally {
				setLoading(false);
			}
		},
		[],
	);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		placeOrder,
		loading,
		error,
		clearError,
	};
};

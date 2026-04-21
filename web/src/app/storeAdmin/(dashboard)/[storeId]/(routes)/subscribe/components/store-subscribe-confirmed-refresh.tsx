"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useStoreAdminContext } from "../../components/store-admin-context";

export interface StoreSubscribeConfirmedRefreshProps {
	/**
	 * When set (e.g. from `SubscriptionPayment.targetStoreLevel`), updates the
	 * header plan badge immediately; `router.refresh()` still reconciles full RSC data.
	 */
	targetLevel?: number | null;
}

/**
 * After subscription payment, the parent store-admin layout may have loaded `Store`
 * before `confirmSubscriptionPayment` updated `store.level`. Optionally bump the
 * plan tier via context, then refresh RSC so the shell matches the database.
 */
export function StoreSubscribeConfirmedRefresh({
	targetLevel,
}: StoreSubscribeConfirmedRefreshProps) {
	const router = useRouter();
	const { updateStoreLevel } = useStoreAdminContext();

	useEffect(() => {
		if (targetLevel != null && Number.isFinite(targetLevel)) {
			updateStoreLevel(targetLevel);
		}
		router.refresh();
	}, [router, updateStoreLevel, targetLevel]);

	return null;
}

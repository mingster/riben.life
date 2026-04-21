"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { useTranslation } from "@/app/i18n/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/providers/i18n-provider";
import { StoreLevel } from "@/types/enum";

import { useStoreAdminContext } from "./store-admin-context";

export type StoreAdminPlanLevelController = {
	setPlanLevel: (level: number) => void;
};

function planSubscriptionTitleKey(
	level: number,
):
	| "store_subscribe_plan_free_title"
	| "store_subscribe_plan_pro_title"
	| "store_subscribe_plan_multi_title" {
	if (level === StoreLevel.Multi) {
		return "store_subscribe_plan_multi_title";
	}
	if (level === StoreLevel.Pro) {
		return "store_subscribe_plan_pro_title";
	}
	return "store_subscribe_plan_free_title";
}

export interface StoreAdminPlanBadgeProps {
	/**
	 * Called once after mount (and again if the underlying setter identity changes)
	 * with `{ setPlanLevel }` so parents or tests can imperatively sync the shell
	 * after flows such as Stripe subscribe confirmation.
	 */
	onPlanLevelControllerReady?: (
		controller: StoreAdminPlanLevelController,
	) => void;
}

/**
 * Store admin header control: plan tier label. Free → subscribe checkout; paid → billing hub.
 */
export function StoreAdminPlanBadge({
	onPlanLevelControllerReady,
}: StoreAdminPlanBadgeProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { store, updateStoreLevel } = useStoreAdminContext();

	const planTitleKey = planSubscriptionTitleKey(store.level);
	const isFree = store.level === StoreLevel.Free;
	const planHref = isFree
		? `/storeAdmin/${store.id}/subscribe`
		: `/storeAdmin/${store.id}/billing`;
	const planLinkTitle = isFree
		? t("subscription_page_title")
		: t("store_admin_billing_title");

	const onReadyRef = useRef(onPlanLevelControllerReady);
	onReadyRef.current = onPlanLevelControllerReady;

	useEffect(() => {
		const cb = onReadyRef.current;
		if (!cb) {
			return;
		}
		cb({ setPlanLevel: updateStoreLevel });
	}, [updateStoreLevel]);

	return (
		<Button
			variant="secondary"
			size="sm"
			asChild
			className="h-8 shrink-0 px-2.5 text-xs font-semibold tracking-wide touch-manipulation sm:h-8 sm:min-h-0"
		>
			<Link href={planHref} title={planLinkTitle}>
				{t(planTitleKey)}
			</Link>
		</Button>
	);
}

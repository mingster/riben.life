"use client";

import { useTranslation } from "@/app/i18n/client";
import { AskUserToSignIn } from "@/components/auth/ask-user-to-signIn";
import { GlobalNavbar } from "@/components/global-navbar";
import { DisplayOrder } from "@/components/display-order";
import StoreRequirePrepaidPrompt from "@/components/store-require-prepaid-prompt";
import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { useI18n } from "@/providers/i18n-provider";
import type { Store, StoreOrder } from "@/types";
import Link from "next/link";

// view order page (購物明細)

export interface props {
	store: Store;
	order: StoreOrder;
}

export const DisplayClient: React.FC<props> = ({ store, order }) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	//console.log("order", JSON.stringify(order));

	return (
		<div className="bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
			<GlobalNavbar title="" />
			<Container>
				<h1 className="text-4xl sm:text-xl pb-2">{t("order_view_title")}</h1>

				{store.requirePrepaid && order.isPaid === false && (
					<StoreRequirePrepaidPrompt />
				)}

				<DisplayOrder order={order} />

				<Link href={`/s/${store.id}`} className="">
					<Button className="w-full">{t("cart_summary_keepShopping")}</Button>
				</Link>

				<AskUserToSignIn />
			</Container>
		</div>
	);
};

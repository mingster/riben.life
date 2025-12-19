import getCurrentUser from "@/actions/user/get-current-user";
import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import type { StoreOrder, User } from "@/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountTabs } from "../components/tabs";

export const metadata: Metadata = {
	title: "Billing History",
};

export default async function BillingHistoryPage() {
	const user = (await getCurrentUser()) as User;

	if (!user) {
		redirect(`/signIn?callbackUrl=/account/order-history`);
	} else {
		//console.log(`user: ${JSON.stringify(u)}`);

		const { t } = await getT();
		const title = t("billing_history_page_title");

		return (
			<Suspense fallback={<Loader />}>
				<GlobalNavbar title={title} />
				<AccountTabs
					orders={user.Orders as StoreOrder[] | []}
					addresses={user.Addresses}
					user={user}
				/>
			</Suspense>
		);
	}
}

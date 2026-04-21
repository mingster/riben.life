import type { Metadata } from "next";
import { redirect } from "next/navigation";
import getCurrentUser from "@/actions/user/get-current-user";
import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import type { User } from "@/types";

export const metadata: Metadata = {
	title: "My Account",
};

export default async function SubscriptionPage() {
	const user = (await getCurrentUser()) as User;

	if (!user) {
		redirect(`/signIn?callbackUrl=/account`);
	} else {
		//console.log(`user: ${JSON.stringify(u)}`);

		const { t } = await getT();
		const title = t("subscription_page_title");

		return <GlobalNavbar title={title} />;
	}
}

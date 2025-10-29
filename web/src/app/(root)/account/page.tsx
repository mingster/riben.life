import getCurrentUser from "@/actions/user/get-current-user";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import type { User } from "@/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountTabs } from "./components/tabs";
import { GlobalNavbar } from "@/components/global-navbar";
import { getT } from "@/app/i18n";
import { UserClient } from "./components/client-user";

export const metadata: Metadata = {
	title: "My Account",
};

export default async function AccountPage() {
	const user = (await getCurrentUser()) as User;

	//logger.info(user);
	/*
				<Container>
					<AccountTabs
						orders={user.Orders}
						addresses={user.Addresses}
						user={user}
					/>
				</Container>

*/
	if (!user) {
		redirect(`/signin?callbackUrl=/account`);
	} else {
		//console.log(`user: ${JSON.stringify(u)}`);

		const { t } = await getT();
		const title = t("page_title_account");

		return (
			<Suspense fallback={<Loader />}>
				<GlobalNavbar title={title} />
				<UserClient user={user} />
			</Suspense>
		);
	}
}

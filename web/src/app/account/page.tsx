import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import getCurrentUser from "@/actions/user/get-current-user";
import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import type { User } from "@/types";
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
		redirect(`/signIn?callbackUrl=/account`);
	} else {
		//console.log(`user: ${JSON.stringify(user)}`);

		const { t } = await getT();
		const title = t("page_title_account");

		return (
			<>
				<GlobalNavbar title={title} />
				<Suspense fallback={<Loader />}>
					<UserClient user={user} />
				</Suspense>
			</>
		);
	}
}

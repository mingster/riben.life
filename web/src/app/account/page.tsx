import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import getCurrentUser from "@/actions/user/get-current-user";
import { getT } from "@/app/i18n";
import { GlobalNavbar } from "@/components/global-navbar";
import { Loader } from "@/components/loader";
import { sqlClient } from "@/lib/prismadb";
import { UserClient } from "./components/client-user";

export const metadata: Metadata = {
	title: "My Account",
};

export default async function AccountPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect(`/signIn?callbackUrl=/account`);
	}

	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	const { t } = await getT();
	const title = t("page_title_account");

	return (
		<>
			<GlobalNavbar title={title} />
			<Suspense fallback={<Loader />}>
				<UserClient systemSettings={systemSettings} user={user} />
			</Suspense>
		</>
	);
}

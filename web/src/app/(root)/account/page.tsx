import getCurrentUser from "@/actions/user/get-current-user";
import { GlobalNavbar } from "@/components/global-navbar";
import type { User } from "@/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getT } from "@/app/i18n";
import { UserClient } from "./components/client-user";
import { sqlClient } from "@/lib/prismadb";

export const metadata: Metadata = {
	title: "My Account",
};

export default async function AccountPage() {
	// Parallel queries for optimal performance
	const [user, { t }] = await Promise.all([getCurrentUser(), getT()]);

	if (!user) {
		redirect(`/signIn?callbackUrl=/account`);
	}

	const title = t("page_title_account");

	//console.log("user.line_userId", user.line_userId);

	// Fetch system notification settings (to check plugin status)
	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	return (
		<>
			<GlobalNavbar title={title} />
			<UserClient user={user as User} systemSettings={systemSettings} />
		</>
	);
}

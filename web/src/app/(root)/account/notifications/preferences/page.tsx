import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { GlobalNavbar } from "@/components/global-navbar";
import getCurrentUser from "@/actions/user/get-current-user";
import { sqlClient } from "@/lib/prismadb";
import { ClientUserPreferences } from "./components/client-user-preferences";
import type { Metadata } from "next";
import { getT } from "@/app/i18n";

export const metadata: Metadata = {
	title: "Notification Preferences",
};

export default async function UserNotificationPreferencesPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect(`/signin?callbackUrl=/account/notifications/preferences`);
	}

	const { t } = await getT();

	// Fetch system notification settings (to check plugin status)
	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	const title = t("notification_preferences");

	return (
		<>
			<GlobalNavbar title={title} />
			<Suspense fallback={<Loader />}>
				<Container>
					<ClientUserPreferences systemSettings={systemSettings} />
				</Container>
			</Suspense>
		</>
	);
}

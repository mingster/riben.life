import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { GlobalNavbar } from "@/components/global-navbar";
import getCurrentUser from "@/actions/user/get-current-user";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { ClientNotifications } from "./components/client-notifications";
import type { Metadata } from "next";
import { getT } from "@/app/i18n";

export const metadata: Metadata = {
	title: "Notifications",
};

export default async function NotificationsPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect(`/signIn?callbackUrl=/account/notifications`);
	}

	const { t } = await getT();

	// Fetch user notifications
	const notifications = await sqlClient.messageQueue.findMany({
		where: {
			recipientId: user.id,
			isDeletedByRecipient: false,
		},
		include: {
			Sender: {
				select: {
					id: true,
					name: true,
					email: true,
					image: true,
				},
			},
			Store: {
				select: {
					id: true,
					name: true,
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		take: 50, // Initial load
	});

	// Transform BigInt and Decimal to numbers for JSON serialization
	transformPrismaDataForJson(notifications);

	const title = t("notifications");

	return (
		<>
			<GlobalNavbar title={title} />
			<Suspense fallback={<Loader />}>
				<Container>
					<ClientNotifications initialNotifications={notifications as any} />
				</Container>
			</Suspense>
		</>
	);
}

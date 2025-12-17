"use server";

import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { ClientSendNotification } from "./components/client-send-notification";

export default async function SendNotificationPage() {
	// Fetch users and message templates for the form
	const [users, messageTemplates] = await Promise.all([
		sqlClient.user.findMany({
			select: {
				id: true,
				name: true,
				email: true,
			},
			orderBy: {
				createdAt: "desc",
			},
		}),
		sqlClient.messageTemplate.findMany({
			where: {
				isGlobal: true,
			},
			select: {
				id: true,
				name: true,
			},
			orderBy: {
				name: "asc",
			},
		}),
	]);

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ClientSendNotification
					users={users}
					messageTemplates={messageTemplates}
				/>
			</Container>
		</Suspense>
	);
}

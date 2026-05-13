"use server";

import { Suspense } from "react";
import { headers } from "next/headers";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { ClientSendNotification } from "./components/client-send-notification";

export default async function SendNotificationPage() {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	const currentUserId = session?.user?.id ?? null;

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
				templateType: true,
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
					currentUserId={currentUserId}
				/>
			</Container>
		</Suspense>
	);
}

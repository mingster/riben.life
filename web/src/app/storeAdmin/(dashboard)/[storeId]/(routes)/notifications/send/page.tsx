import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { ClientSendNotification } from "./components/client-send-notification";

type Params = Promise<{ storeId: string }>;

export default async function SendNotificationPage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	// Get store (access check already done in layout)
	const storeResult = await getStoreWithRelations(storeId, {});

	if (!storeResult) {
		redirect("/storeAdmin");
	}

	// Fetch customers for this store (users who are members of the store's organization)
	const store = await sqlClient.store.findUnique({
		where: { id: storeId },
		select: { organizationId: true },
	});

	let customers: Array<{
		id: string;
		name: string | null;
		email: string | null;
	}> = [];

	if (store?.organizationId) {
		const members = await sqlClient.member.findMany({
			where: {
				organizationId: store.organizationId,
			},
			select: { userId: true },
		});

		if (members.length > 0) {
			const users = await sqlClient.user.findMany({
				where: {
					id: {
						in: members.map((m) => m.userId),
					},
				},
				select: {
					id: true,
					name: true,
					email: true,
				},
				orderBy: {
					name: "asc",
				},
			});

			customers = users;
		}
	}

	// Fetch templates for this store (store-specific and global)
	const messageTemplates = await sqlClient.messageTemplate.findMany({
		where: {
			OR: [
				{ storeId }, // Store-specific templates
				{ isGlobal: true }, // Global templates
			],
		},
		select: {
			id: true,
			name: true,
		},
		orderBy: {
			name: "asc",
		},
	});

	// Fetch system notification settings to check plugin status
	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	// Fetch store channel configurations
	const channelConfigs = await sqlClient.notificationChannelConfig.findMany({
		where: { storeId },
	});

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ClientSendNotification
					storeId={storeId}
					customers={customers}
					messageTemplates={messageTemplates}
					systemSettings={systemSettings}
					channelConfigs={channelConfigs}
				/>
			</Container>
		</Suspense>
	);
}

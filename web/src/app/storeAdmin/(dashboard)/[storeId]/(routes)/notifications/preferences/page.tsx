import { Suspense } from "react";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { redirect } from "next/navigation";
import { ClientPreferences } from "./components/client-preferences";
import type { NotificationPreferences } from "@prisma/client";

type Params = Promise<{ storeId: string }>;

export default async function StorePreferencesPage(props: { params: Params }) {
	const params = await props.params;
	const storeId = params.storeId;

	const storeResult = await getStoreWithRelations(storeId, {});
	if (!storeResult) {
		redirect("/storeAdmin");
	}

	// Fetch store default preferences (userId is null for store defaults)
	const storePreferences = await sqlClient.notificationPreferences.findFirst({
		where: {
			storeId,
			userId: null,
		},
	});

	// Fetch system settings to check which channels are enabled
	const systemSettings = await sqlClient.systemNotificationSettings.findFirst();

	return (
		<Suspense fallback={<Loader />}>
			<Container>
				<ClientPreferences
					storeId={storeId}
					storePreferences={storePreferences as NotificationPreferences | null}
					systemSettings={systemSettings}
				/>
			</Container>
		</Suspense>
	);
}

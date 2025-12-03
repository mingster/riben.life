import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { redirect } from "next/navigation";
import StoreAdminLayout from "./components/store-admin-layout";

import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Store, SystemMessage } from "@/types";
import { cookies } from "next/headers";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { getStoreWithRelations } from "@/lib/store-access";

export default async function StoreLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;
	const { children } = props;

	// Use checkStoreAccess to consolidate session check and store query
	// This prevents duplicate database connections
	const accessibleStore = await checkStoreStaffAccess(params.storeId);

	if (!accessibleStore) {
		logger.info("store not found...redirect to store creation page.");
		redirect("/storeAdmin");
	}

	// determine i18n languageId
	const cookieStore = await cookies();
	const lng = cookieStore.get(cookieName)?.value || fallbackLng;

	const messages = (await sqlClient.systemMessage.findMany({
		where: { published: true, localeId: lng },
		orderBy: { createdOn: "desc" },
	})) as SystemMessage[];

	const [store] = await Promise.all([
		getStoreWithRelations(params.storeId, {
			includeProducts: true,
			includeOrders: true,
			includeCategories: true,
			includePaymentMethods: true,
			includeShippingMethods: true,
			includeAnnouncements: true,
			includeTables: true,
			includeSupportTickets: true,
		}),
	]);

	if (!store) {
		logger.warn("Store not found after access check", {
			metadata: { storeId: params.storeId },
		});
		redirect("/storeAdmin");
	}

	return (
		<StoreAdminLayout sqlData={store} storeSettings={null}>
			{showSystemMessage("System Message", messages[0]?.message || "")}
			{children}
		</StoreAdminLayout>
	);
}

function showSystemMessage(title: string, content: string) {
	if (!content) {
		return "";
	}

	return (
		<Card className="border-green-300 dark:border-green-600">
			{title && (
				<CardHeader>
					<CardTitle>{title}</CardTitle>
				</CardHeader>
			)}
			<CardContent>{content}</CardContent>
		</Card>
	);
}

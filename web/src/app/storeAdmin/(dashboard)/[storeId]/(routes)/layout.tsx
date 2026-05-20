import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logger from "@/lib/logger";
import { getStoreWithRelations } from "@/lib/store-access";
import { isPro } from "@/lib/store-admin-utils";
import { transformPrismaDataForJson } from "@/utils/utils";
import { sqlClient } from "@/lib/prismadb";

import StoreAdminLayout from "./components/store-admin-layout";

export default async function StoreAdminRoutesLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;
	const { children } = props;

	if (!params.storeId) {
		redirect("/storeAdmin");
	}

	const cookieStore = await cookies();
	const lng = cookieStore.get(cookieName)?.value || fallbackLng;

	const messages = await sqlClient.systemMessage.findMany({
		where: { published: true, locales: { some: { localeId: lng } } },
		orderBy: { createdOn: "desc" },
		include: { locales: true },
	});

	const store = await getStoreWithRelations(params.storeId, {
		includeProducts: true,
		includeOrders: true,
		includeCategories: true,
		includePaymentMethods: true,
		includeShippingMethods: true,
		includeAnnouncements: true,
		includeTables: true,
		includeSupportTickets: true,
		includeRsvpSettings: true,
		includeWaitListSettings: true,
	});

	if (!store) {
		logger.warn("Store not found after access check", {
			metadata: { storeId: params.storeId },
		});
		redirect("/storeAdmin");
	}

	transformPrismaDataForJson(store);

	const canImportExport = await isPro(params.storeId);

	return (
		<StoreAdminLayout sqlData={store} canImportExport={canImportExport}>
			{showSystemMessage(
				"System Message",
				messages[0]?.locales.find((l) => l.localeId === lng)?.message ?? "",
			)}
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

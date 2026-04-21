import type { Metadata, ResolvingMetadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { getStoreWithRelations } from "@/lib/store-access";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import type { SystemMessage } from "@/types";
import { transformPrismaDataForJson } from "@/utils/utils";

import StoreAdminLayout from "./(routes)/components/store-admin-layout";

type Props = {
	params: Promise<{ storeId: string }>;
};

export async function generateMetadata(
	props: Props,
	_parent: ResolvingMetadata,
): Promise<Metadata> {
	const params = await props.params;
	if (!params.storeId) {
		return { title: "Store admin" };
	}

	const store = await sqlClient.store.findFirst({
		where: { id: params.storeId, isDeleted: false },
		select: { name: true },
	});

	if (!store) {
		return { title: "Store admin" };
	}

	return {
		title: `${store.name} — Store admin`,
	};
}

export default async function StoreAdminStoreLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;
	const { children } = props;

	if (!params.storeId) {
		redirect("/storeAdmin");
	}

	/** Single layout for all `/storeAdmin/[storeId]/…` segments (avoids nested `(routes)` layout edge cases). */
	const accessibleStore = await checkStoreStaffAccess(params.storeId);

	if (!accessibleStore) {
		logger.info("store not found...redirect to store creation page.");
		redirect("/storeAdmin");
	}

	const cookieStore = await cookies();
	const lng = cookieStore.get(cookieName)?.value || fallbackLng;

	const messages = (await sqlClient.systemMessage.findMany({
		where: { published: true, localeId: lng },
		orderBy: { createdOn: "desc" },
	})) as SystemMessage[];

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

	return (
		<StoreAdminLayout sqlData={store}>
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

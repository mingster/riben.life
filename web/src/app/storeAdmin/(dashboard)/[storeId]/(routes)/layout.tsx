import { sqlClient } from "@/lib/prismadb";
import logger from "@/lib/logger";
import { transformDecimalsToNumbers } from "@/utils/utils";
import { redirect } from "next/navigation";
import StoreAdminLayout from "./components/store-admin-layout";

import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemMessage } from "@/types";
import { cookies, headers } from "next/headers";
import { auth, Session } from "@/lib/auth";

export default async function StoreLayout(props: {
	children: React.ReactNode;
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;

	const { children } = props;

	const session = (await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	})) as unknown as Session;

	//console.log('session: ' + JSON.stringify(session));
	//console.log('userId: ' + user?.id);

	if (session.user?.role !== "owner" && session.user?.role !== "admin") {
		console.log("access denied");
		redirect("/error/?code=500");
	}

	//const chk = (await checkStoreAccess(params.storeId));

	const store = await sqlClient.store.findFirst({
		where: {
			id: params.storeId,
			ownerId: session.user?.id,
		},
		include: {
			Owner: true,
			Products: true,
			StoreOrders: {
				orderBy: {
					updatedAt: "desc",
				},
			},
			StoreShippingMethods: {
				include: {
					ShippingMethod: true,
				},
			},
			StorePaymentMethods: {
				include: {
					PaymentMethod: true,
				},
			},
			Categories: true,
			StoreAnnouncement: {
				orderBy: {
					updatedAt: "desc",
				},
			},
		},
	});
	transformDecimalsToNumbers(store);

	if (!store) {
		logger.info("store not found...redirect to store creation page.");
		//console.log("no access to the store...redirect to store creation page.");
		redirect("/storeAdmin");
	}


	// determine i18n languageId
	const cookieStore = await cookies();
	const lng = cookieStore.get(cookieName)?.value || fallbackLng;

	const messages = (await sqlClient.systemMessage.findMany({
		where: { published: true, localeId: lng },
		orderBy: { createdOn: "desc" },
	})) as SystemMessage[];

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

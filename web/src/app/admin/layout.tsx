//import AdminPanelLayout from "./components/_old/admin-panel-layout";
import { cookieName, fallbackLng } from "@/app/i18n/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sqlClient } from "@/lib/prismadb";
import type { SystemMessage } from "@/types";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkAdminAccess } from "./admin-utils";
import AdminLayout from "./components/admin-layout";

export default async function AdminDashboardLayout({
	children,
	//params,
}: {
	children: React.ReactNode;
	//params: { storeId: string };
}) {
	const isAdmin = (await checkAdminAccess()) as boolean;
	if (!isAdmin) redirect("/error/?code=500&message=Unauthorized");
	const cookieStore = await cookies();

	const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

	// determine i18n languageId
	const lng = cookieStore.get(cookieName)?.value || fallbackLng;

	const messages = (await sqlClient.systemMessage.findMany({
		where: { published: true, localeId: lng },
		orderBy: { createdOn: "desc" },
	})) as SystemMessage[];

	return (
		<AdminLayout defaultOpen={defaultOpen}>
			{showSystemMessage("", messages[0]?.message || "")}
			{children}
		</AdminLayout>
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

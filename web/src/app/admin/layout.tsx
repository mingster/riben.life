import { redirect } from "next/navigation";
import { checkAdminAccess } from "./admin-utils";
import AdminPanelLayout from "./components/admin-panel-layout";
import AdminLayout from "./components/layout";
import { cookies } from "next/headers";

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

	return <AdminLayout defaultOpen={defaultOpen}>{children}</AdminLayout>;
}

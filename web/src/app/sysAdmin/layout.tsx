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
	if (!isAdmin) {
		redirect("/signIn/?callbackUrl=/sysAdmin");
	}

	/*
	const session = await auth.api.getSession({
		headers: await headers(), // you need to pass the headers object.
	});
	if (!session) {
		redirect("/signIn/?redirect_url=/sysAdmin");
	}

	console.log("admin user", session.user?.email, session.user?.role);
	*/

	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

	return <AdminLayout defaultOpen={defaultOpen}>{children}</AdminLayout>;
}

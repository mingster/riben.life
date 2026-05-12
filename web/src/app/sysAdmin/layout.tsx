import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { checkAdminAccess } from "@/lib/admin/access";

import AdminLayout from "./components/admin-layout";

export default async function SysAdminRootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const allowed = await checkAdminAccess();

	if (!allowed) {
		redirect("/signIn/?callbackUrl=/sysAdmin");
	}

	const cookieStore = await cookies();
	const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

	return <AdminLayout defaultOpen={defaultOpen}>{children}</AdminLayout>;
}

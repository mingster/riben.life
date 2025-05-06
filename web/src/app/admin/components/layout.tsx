"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./sidebar";
import { AdminNavbar } from "./admin-navbar";
import { AdminFooter } from "./admin-footer";

interface props {
	defaultOpen: boolean | undefined;
	children: React.ReactNode;
}

export default function AdminLayout({ defaultOpen, children }: props) {
	/*<SidebarProvider style={{ "--sidebar-width": "240px", "--sidebar-width-icon": "56px" }} */

	return (
		<>
			<AdminNavbar title="" />
			<div className="flex min-h-screen">
				<SidebarProvider defaultOpen={defaultOpen}>
					<AdminSidebar />

					<main className="flex-1 w-full overflow-auto pl-1">
						<SidebarTrigger />
						{children}
					</main>
				</SidebarProvider>
				<footer>
					<AdminFooter />
				</footer>
			</div>
		</>
	);
}

"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./sidebar";
import { AdminNavbar } from "./admin-navbar";
import { AdminFooter } from "./admin-footer";

interface props {
	defaultOpen: boolean | undefined;
	children: React.ReactNode;
}

export default function AdminLayout({ defaultOpen, children }: props) {
	return (
		<div className="">
			{" "}
			<AdminNavbar title="" />
			<SidebarProvider defaultOpen={defaultOpen}>
				<AppSidebar />
				<main>
					<SidebarTrigger />
					{children}
				</main>
				<footer>
					<AdminFooter />
				</footer>
			</SidebarProvider>
		</div>
	);
}

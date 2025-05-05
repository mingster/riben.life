"use client";

import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { AdminFooter } from "./admin-footer";
import { AdminNavbar } from "./admin-navbar";
import { AdminSidebar } from "./admin-sidebar";

export default function AdminPanelLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const sidebar = useStore(useSidebarToggle, (state) => state);

	if (!sidebar) return null;

	//bg-zinc-200 dark:bg-zinc-900
	//bg-gradient-to-b from-transparent via-cyan-100 to-green-200 dark:from-blue-900 dark:to-black-900
	return (
		<div className="">
			<AdminNavbar title="" />
			<AdminSidebar />
			<main
				className={cn(
					"min-h-[calc(100vh_-_56px)] transition-[margin-left] duration-300 ease-in-out",
					sidebar?.isOpen === false ? "md:ml-[90px]" : "md:ml-72",
				)}
			>
				{children}
			</main>
			<footer
				className={cn(
					"transition-[margin-left] duration-300 ease-in-out",
					sidebar?.isOpen === false ? "md:ml-[90px]" : "md:ml-72",
				)}
			>
				<AdminFooter />
			</footer>
		</div>
	);
}

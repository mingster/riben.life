"use client";

import DropdownUser from "@/components/auth/dropdown-user";
import { ThemeToggler } from "@/components/theme-toggler";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";

import { BackgroundImage } from "@/components/BackgroundImage";
import { AdminSidebar } from "./admin-sidebar";

interface AdminLayoutProps {
	defaultOpen: boolean;
	children: React.ReactNode;
}

export default function AdminLayout({
	defaultOpen,
	children,
}: AdminLayoutProps) {
	return (
		<SidebarProvider
			defaultOpen={defaultOpen}
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 56)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AdminSidebar />
			<SidebarInset>
				<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b">
					<BackgroundImage />
					<div className="flex w-full items-center gap-2 px-4 lg:px-6">
						<SidebarTrigger className="-ml-1 h-10 w-10 sm:h-9 sm:w-9" />
						<Separator
							orientation="vertical"
							className="mx-2 data-[orientation=vertical]:h-4"
						/>
						<h1 className="text-base font-medium">Administration</h1>
						<div className="ml-auto flex items-center gap-2">
							<ThemeToggler />
							<DropdownUser />
						</div>
					</div>
				</header>
				<div className="flex flex-1 flex-col">
					<div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
						{children}
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

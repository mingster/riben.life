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
import { AdminBreadCrumb } from "./admin-bread-crumb";
import { AdminSidebar } from "./admin-sidebar";

export interface props {
	defaultOpen: boolean;
	children: React.ReactNode;
}

const AdminLayout: React.FC<props> = ({ defaultOpen, children }) => {
	return (
		<SidebarProvider
			defaultOpen={defaultOpen}
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AdminSidebar />
			<SidebarInset>
				<StoreAdminHeader />
				<div className="flex flex-1 flex-col">
					<div className="@container/main flex flex-1 flex-col gap-2">
						<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
							<div className="px-4 lg:px-6 pb-1 font-mono">
								<AdminBreadCrumb />
								{children}
							</div>
						</div>
					</div>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
};

function StoreAdminHeader() {
	const title = "";

	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			{/* background image */}
			<BackgroundImage />

			<div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
				<h1 className="text-base font-medium">{title}</h1>
				<div className="ml-auto flex items-center gap-2">
					<ThemeToggler />
					<DropdownUser />
				</div>
			</div>
		</header>
	);
}

export default AdminLayout;

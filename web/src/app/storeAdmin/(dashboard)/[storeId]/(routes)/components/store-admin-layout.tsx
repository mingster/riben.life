"use client";

//import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
//import { useStore } from "@/hooks/use-store";
//import { cn } from "@/lib/utils";
import type { Store } from "@/types";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { StoreSettings } from "@prisma/client";
import { StoreAdminFooter } from "./store-admin-footer";
import { StoreAdminNavbar } from "./store-admin-navbar";
import { StoreAdminSidebar } from "./store-admin-sidebar";

export interface props {
	sqlData: Store;
	storeSettings: StoreSettings | null;
	children: React.ReactNode;
}

const StoreAdminLayout: React.FC<props> = ({
	sqlData,
	storeSettings,
	children,
}) => {
	//<div className="bg-top bg-cover bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
	/*
	className={cn(
		"transition-[margin-left] duration-300 ease-in-out md:ml-[90px]"
	)}
	*/
	return (
		<>
			<StoreAdminNavbar store={sqlData} />

			<div className="flex min-h-screen">
				<SidebarProvider defaultOpen={true}>
					<StoreAdminSidebar store={sqlData} />

					<main className="flex-1 w-full overflow-auto pl-1">
						<SidebarTrigger />
						{children}
					</main>
				</SidebarProvider>

				<footer>
					<StoreAdminFooter />
				</footer>
			</div>
		</>
	);
};
export default StoreAdminLayout;

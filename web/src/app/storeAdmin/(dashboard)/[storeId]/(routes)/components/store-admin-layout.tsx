"use client";

import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import type { Store } from "@/types";

import { StoreSettings } from "@prisma/client";
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
	const sidebar = useStore(useSidebarToggle, (state) => state);

	if (!sidebar) return null;

	//<div className="bg-top bg-cover bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
	return (
		<div className="bg-body">
			<StoreAdminNavbar store={sqlData} />
			<StoreAdminSidebar store={sqlData} />
			<main
				className={cn(
					"min-h-[calc(100vh_-_56px)] transition-[margin-left] duration-300 ease-in-out ",
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
				<StoreAdminFooter />
			</footer>
		</div>
	);
};
export default StoreAdminLayout;

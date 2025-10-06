"use client";

//import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
//import { useStore } from "@/hooks/use-store";
//import { cn } from "@/lib/utils";
import type { Store } from "@/types";

import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import type { StoreSettings } from "@prisma/client";
import { StoreAdminSidebar } from "./store-admin-sidebar";
import ThemeToggler from "@/components/theme-toggler";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import router from "next/dist/client/router";
import DropdownUser from "@/components/auth/dropdown-user";

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
			<SidebarProvider
				style={
					{
						"--sidebar-width": "calc(var(--spacing) * 52)",
						"--header-height": "calc(var(--spacing) * 12)",
					} as React.CSSProperties
				}
			>
				<StoreAdminSidebar store={sqlData} />
				<SidebarInset>
					<StoreAdminHeader />
					<div className="flex flex-1 flex-col">
						<div className="@container/main flex flex-1 flex-col">
							<div className="flex flex-col gap-0 py-0 md:gap-6 md:py-6">
								<div className="px-4 lg:px-6 pb-1">{children}</div>
							</div>
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</>
	);
};

function StoreAdminHeader() {
	const title = "";

	const { data: session } = authClient.useSession();
	if (!session) {
		router.push("/signin?callbackUrl=/storeAdmin");
	}
	const user = session?.user;

	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-0 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			{/* background image */}
			<div className="absolute inset-x-0 top-0 z-20 flex justify-center overflow-hidden pointer-events-none">
				<div className="w-[108rem] flex-none flex justify-end">
					<picture>
						<source srcSet="/img/beams/docs@30.avif" type="image/avif" />
						<img
							src="/img/beams/docs@tinypng.png"
							alt=""
							className="w-[71.75rem] flex-none max-w-none dark:hidden"
							decoding="async"
						/>
					</picture>
					<picture>
						<source srcSet="/img/beams/docs-dark@30.avif" type="image/avif" />
						<img
							src="/img/beams/docs-dark@tinypng.png"
							alt=""
							className="w-[90rem] flex-none max-w-none hidden dark:block"
							decoding="async"
						/>
					</picture>
				</div>
			</div>

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

export default StoreAdminLayout;

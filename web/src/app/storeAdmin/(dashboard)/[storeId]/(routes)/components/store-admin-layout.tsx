"use client";

//import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
//import { useStore } from "@/hooks/use-store";
//import { cn } from "@/lib/utils";
import type { Store } from "@/types";

import DropdownUser from "@/components/auth/dropdown-user";
import { BackgroundImage } from "@/components/BackgroundImage";
import LanguageToggler from "@/components/language-toggler";
import { ThemeToggler } from "@/components/theme-toggler";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import type { StoreSettings } from "@prisma/client";
import { StoreAdminSidebar } from "./store-admin-sidebar";
import { StoreLevel } from "@/types/enum";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

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
					<StoreAdminHeader store={sqlData} />
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

function StoreAdminHeader({ store }: { store: Store }) {
	const title = "Store Admin";

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-0 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
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
					<Button variant="outline" size="sm">
						<Link
							href={`/storeAdmin/${store.id}/subscribe`}
							className="text-xs"
						>
							{store.level === StoreLevel.Free
								? t("storeAdmin_switchLevel_free")
								: store.level === StoreLevel.Pro
									? t("storeAdmin_switchLevel_pro")
									: t("storeAdmin_switchLevel_multi")}
						</Link>
					</Button>

					<ThemeToggler />
					<DropdownUser />
					<LanguageToggler />
				</div>
			</div>
		</header>
	);
}

export default StoreAdminLayout;

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
import {
	StoreAdminProvider,
	useStoreAdminContext,
} from "./store-admin-context";
import { StoreLevel } from "@/types/enum";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { IconHome } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

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

	//console.log("sqlData", sqlData);

	return (
		<>
			<StoreAdminProvider store={sqlData}>
				<SidebarProvider
					style={
						{
							"--sidebar-width": "calc(var(--spacing) * 52)",
							"--header-height": "calc(var(--spacing) * 12)",
						} as React.CSSProperties
					}
				>
					<StoreAdminSidebar />
					<SidebarInset>
						<StoreAdminHeader />
						<div className="flex flex-1 flex-col">
							<div className="@container/main flex flex-1 flex-col">
								<div className="flex flex-col gap-0 py-2 sm:py-4 md:gap-6 md:py-6">
									<div className="px-3 sm:px-4 lg:px-6 pb-1">{children}</div>
								</div>
							</div>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</StoreAdminProvider>
		</>
	);
};

function StoreAdminHeader() {
	const title = "Store Admin";

	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { store } = useStoreAdminContext();

	const router = useRouter();
	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-0 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			{/* background image */}
			<BackgroundImage />

			<div className="flex w-full items-center gap-1.5 px-3 sm:gap-2 sm:px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1 h-10 w-10 min-h-[44px] min-w-[44px] sm:h-9 sm:w-9 sm:min-h-0 sm:min-w-0" />
				<Separator
					orientation="vertical"
					className="mx-1.5 hidden sm:block data-[orientation=vertical]:h-4 sm:mx-2"
				/>
				<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
					<h1 className="text-sm font-medium truncate sm:text-base">{title}</h1>
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push(`/${store.id}`)}
						className="hidden items-center gap-1 text-xs h-9 min-h-[36px] sm:flex"
						title={t("back_to_store")}
					>
						<IconHome />
						<span className="hidden lg:inline">{t("back_to_store")}</span>
					</Button>
				</div>

				<div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
					<Button
						variant="outline"
						size="sm"
						className="hidden h-9 min-h-[36px] text-xs sm:inline-flex"
					>
						<Link
							href={`/storeAdmin/${store.id}/subscribe`}
							className="text-xs"
						>
							<span className="hidden lg:inline">
								{store.level === StoreLevel.Free
									? t("storeAdmin_switchLevel_free")
									: store.level === StoreLevel.Pro
										? t("storeAdmin_switchLevel_pro")
										: t("storeAdmin_switchLevel_multi")}
							</span>
							<span className="lg:hidden">Level</span>
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

"use client";

import { IconHome } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import DropdownUser from "@/components/auth/dropdown-user";
import { BackgroundImage } from "@/components/BackgroundImage";
import LanguageToggler from "@/components/language-toggler";
import DropdownNotification from "@/components/notification/dropdown-notification";
import { ThemeToggler } from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
//import { useSidebarToggle } from "@/hooks/use-sidebar-toggle";
//import { useStore } from "@/hooks/use-store";
//import { cn } from "@/lib/utils";
import { StoreAdminFullWidthProvider } from "@/contexts/store-admin-full-width";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import {
	StoreAdminProvider,
	useStoreAdminContext,
} from "./store-admin-context";
import { StoreAdminPlanBadge } from "./store-admin-plan-badge";
import { StoreAdminSidebar } from "./store-admin-sidebar";

export interface props {
	sqlData: Store;
	children: React.ReactNode;
}

const StoreAdminLayout: React.FC<props> = ({ sqlData, children }) => {
	//<div className="bg-top bg-cover bg-no-repeat bg-[url('/img/beams/hero@75.jpg')] dark:bg-[url('/img/beams/hero-dark@90.jpg')]">
	/*
	className={cn(
		"transition-[margin-left] duration-300 ease-in-out md:ml-[90px]"
	)}
	*/

	//console.log("sqlData", sqlData);

	return (
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
				<SidebarInset className="min-w-0 max-w-full overflow-x-hidden">
					<StoreAdminHeader />
					<div className="flex min-w-0 flex-1 flex-col font-minimal bg-background text-foreground max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]">
						<div className="@container/main flex min-w-0 flex-1 flex-col">
							<div className="flex flex-col gap-0 py-2 sm:py-4 md:gap-6 md:py-6">
								<StoreAdminFullWidthProvider>
									<div className="min-w-0 max-w-full px-3 sm:px-4 lg:px-6 pb-1">
										{children}
									</div>
								</StoreAdminFullWidthProvider>
							</div>
						</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</StoreAdminProvider>
	);
};

function StoreAdminHeader() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { store } = useStoreAdminContext();

	const title = t("user_profile_link_to_store_dashboard");

	const router = useRouter();
	return (
		<header className="flex h-(--header-height) shrink-0 items-center gap-0 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			{/* background image */}
			<BackgroundImage />

			<div className="flex w-full items-center gap-1.5 px-3 sm:gap-2 sm:px-4 lg:gap-2 lg:px-6">
				<SidebarTrigger className="-ml-1 h-10 w-10 sm:h-9 sm:w-9" />
				<Separator
					orientation="vertical"
					className="mx-1.5 hidden sm:block data-[orientation=vertical]:h-4 sm:mx-2"
				/>
				<div className="flex items-center gap-1.5 sm:gap-1 min-w-0 flex-1">
					<h1 className="text-sm font-medium truncate sm:text-base">
						<Link href={`/storeAdmin/${store.id}`}>{title}</Link>
					</h1>
					<Button
						variant="outline"
						size="sm"
						onClick={() => router.push(`/s/${store.id}`)}
						className="inline-flex items-center gap-1 text-xs h-10 sm:h-9 sm:min-h-[36px]"
						title={t("back_to_store")}
					>
						<IconHome />
						<span className="hidden lg:inline">{t("back_to_store")}</span>
					</Button>
				</div>

				<div className="ml-auto flex items-center gap-1 shrink-0">
					<StoreAdminPlanBadge />
					<ThemeToggler />
					<DropdownUser />
					<LanguageToggler />
					<DropdownNotification />
				</div>
			</div>
		</header>
	);
}

export default StoreAdminLayout;

"use client";

import { IconChevronUp, IconHelp, IconHome } from "@tabler/icons-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import { StoreModal } from "@/app/storeAdmin/(root)/store-modal";
import SignOutButton from "@/components/auth/sign-out-button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { useStoreAdminReadyToConfirmRsvpCount } from "@/hooks/store-admin/use-store-admin-ready-to-confirm-rsvp-count";
import { useStoreAdminUnreadSupportTicketCount } from "@/hooks/store-admin/use-store-admin-unread-support-ticket-count";
import { useStoreAdminUnpaidCashCashierCount } from "@/hooks/store-admin/use-store-admin-unpaid-cash-cashier-count";
import { useStoreAdminWaitlistQueueCount } from "@/hooks/store-admin/use-store-admin-waitlist-queue-count";
import { useIsHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";
import { StoreLevel } from "@/types/enum";
import { useI18n } from "@/providers/i18n-provider";
import { GetMenuList } from "./menu-list";
import { useStoreAdminContext } from "./store-admin-context";
import { StoreAdminNavContent } from "./store-admin-nav-content";
import StoreSwitcher from "./store-switcher";

//export function StoreAdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
export function StoreAdminSidebar() {
	//console.log('store', JSON.stringify(store));
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { open } = useSidebar();
	const { store, supportTicketCount } = useStoreAdminContext();
	const params = useParams<{ storeId: string }>();
	const isHydrated = useIsHydrated();

	const pathname = usePathname();

	const acceptReservation = Boolean(
		(
			store as typeof store & {
				rsvpSettings?: { acceptReservation?: boolean } | null;
			}
		).rsvpSettings?.acceptReservation,
	);
	const waitlistEnabled = Boolean(
		(
			store as typeof store & {
				waitListSettings?: { enabled?: boolean } | null;
			}
		).waitListSettings?.enabled,
	);
	const readyToConfirmRsvpCount = useStoreAdminReadyToConfirmRsvpCount(
		acceptReservation ? params.storeId : undefined,
	);

	const unreadSupportTicketCount = useStoreAdminUnreadSupportTicketCount(
		params.storeId,
	);

	const waitlistQueueCount = useStoreAdminWaitlistQueueCount(
		params.storeId,
		waitlistEnabled,
	);

	const cashCashierNavEnabled = Boolean(
		store.useOrderSystem && store.level !== StoreLevel.Free,
	);
	const unpaidCashCashierOrderCount = useStoreAdminUnpaidCashCashierCount(
		params.storeId,
		cashCashierNavEnabled,
	);

	const menuList = GetMenuList(store, pathname, {
		supportTicketCount,
		unreadSupportTicketCount,
		readyToConfirmRsvpCount,
		waitlistQueueCount,
		unpaidCashCashierOrderCount,
	});

	const { setOpen } = useSidebar();
	const [isMounted, setIsMounted] = useState(false);

	// Store collapsible states in localStorage
	// Start with empty object to ensure server and client render match (all default to open)
	const [collapsibleStates, setCollapsibleStates] = useState<
		Record<string, boolean>
	>({});

	// Load collapsible states from localStorage after mount (to avoid hydration mismatch)
	useEffect(() => {
		if (typeof window !== "undefined") {
			try {
				const stored = localStorage.getItem("store-admin-sidebar-collapsible");
				if (stored) {
					const parsed = JSON.parse(stored);
					setCollapsibleStates(parsed);
				}
			} catch {
				// Ignore localStorage errors
			}
		}
	}, []);

	// Save collapsible states to localStorage
	useEffect(() => {
		if (typeof window !== "undefined" && isMounted) {
			try {
				localStorage.setItem(
					"store-admin-sidebar-collapsible",
					JSON.stringify(collapsibleStates),
				);
			} catch {
				// Ignore localStorage errors
			}
		}
	}, [collapsibleStates, isMounted]);

	// Get collapsible state for a key, defaulting to true (open)
	const getCollapsibleState = useCallback(
		(key: string, defaultValue = true) => {
			return collapsibleStates[key] ?? defaultValue;
		},
		[collapsibleStates],
	);

	// Toggle collapsible state
	const toggleCollapsible = useCallback((key: string) => {
		setCollapsibleStates((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	}, []);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	// left to close sidebar, right to open
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "ArrowLeft") {
				setOpen(false);
			}
			if (event.key === "ArrowRight") {
				setOpen(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [setOpen]);

	const renderMenuLabel = (text: string, badge?: number) => (
		<span className="relative inline-flex items-center pr-3">
			<span>{text}</span>
			{badge && badge > 0 ? (
				<span className="absolute -top-0.2 -right-1 size-4 rounded-full bg-green-800 text-slate-100 flex justify-center items-center">
					<span>{badge}</span>
				</span>
			) : null}
		</span>
	);

	// Mobile: 44px touch targets; desktop: default compact height
	const menuButtonTouchClass = "h-11 sm:h-8 touch-manipulation px-3 sm:px-2";
	const groupLabelTouchClass = "h-11 sm:h-8 w-full touch-manipulation";

	return (
		<Sidebar
			collapsible="icon"
			variant="inset"
			className="data-[mobile=true]:overflow-y-auto"
		>
			<SidebarHeader className="px-3 py-2 sm:px-2 sm:py-1.5">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className={cn(
								"data-[slot=sidebar-menu-button]:p-1.5",
								menuButtonTouchClass,
							)}
						></SidebarMenuButton>
					</SidebarMenuItem>

					{isMounted && open && (
						<SidebarMenuItem className="font-mono">
							<StoreSwitcher />
							<StoreModal />
							{/* storeModal is to create new store when switcher's create store is clicked */}
						</SidebarMenuItem>
					)}
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<StoreAdminNavContent
					menuList={menuList}
					isMounted={isMounted}
					getCollapsibleState={getCollapsibleState}
					toggleCollapsible={toggleCollapsible}
					renderMenuLabel={renderMenuLabel}
					menuButtonTouchClass={menuButtonTouchClass}
					groupLabelTouchClass={groupLabelTouchClass}
				/>
			</SidebarContent>

			<SidebarFooter className="px-3 py-2 sm:px-2 sm:py-1.5">
				<SidebarMenu>
					<SidebarMenuItem>
						{isHydrated ? (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton className={menuButtonTouchClass}>
										<IconChevronUp className="ml-auto size-5 sm:size-4 shrink-0" />
									</SidebarMenuButton>
								</DropdownMenuTrigger>
								<DropdownMenuContent
									side="top"
									className="w-[--radix-popper-anchor-width] max-h-[min(70vh,24rem)] overflow-y-auto"
								>
									<DropdownMenuItem
										asChild
										className="h-11 sm:h-9 touch-manipulation"
									>
										<Link
											className="flex items-center gap-2 py-2"
											title={t("back_to_store")}
											href={`/s/${store.id}`}
										>
											<IconHome className="size-5 sm:size-4 shrink-0" />
											{store.name}
										</Link>
									</DropdownMenuItem>
									<DropdownMenuItem
										asChild
										className="h-11 sm:h-9 touch-manipulation"
									>
										<div className="flex w-full">
											<IconHelp className="size-5 sm:size-4 shrink-0 mt-0.5" />
											<Link
												className="flex items-center gap-2 py-2 flex-1"
												href={"/help"}
											>
												{t("help")}
											</Link>
										</div>
									</DropdownMenuItem>
									<DropdownMenuItem className="h-11 sm:h-9 touch-manipulation py-2">
										<SignOutButton />
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						) : (
							<SidebarMenuButton className={menuButtonTouchClass}>
								<IconChevronUp className="ml-auto size-5 sm:size-4 shrink-0" />
							</SidebarMenuButton>
						)}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

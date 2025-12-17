"use client";

import {
	IconChevronDown,
	IconChevronUp,
	IconHelp,
	IconHome,
} from "@tabler/icons-react";

import { useTranslation } from "@/app/i18n/client";
import { StoreModal } from "@/app/storeAdmin/(root)/store-modal";
import SignOutButton from "@/components/auth/sign-out-button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarRail,
	useSidebar,
} from "@/components/ui/sidebar";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { GetMenuList } from "./menu-list";
import StoreSwitcher from "./store-switcher";
import { useStoreAdminContext } from "./store-admin-context";

//export function StoreAdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
export function StoreAdminSidebar() {
	//console.log('store', JSON.stringify(store));
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { open } = useSidebar();
	const { store, supportTicketCount } = useStoreAdminContext();

	const pathname = usePathname();
	const menuList = GetMenuList(store, pathname, {
		supportTicketCount,
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
				<span className="absolute -top-0.2 -right-1 size-4 rounded-full bg-green-800 text-slate-100 flex justify-center items-center text-[10px]">
					<span>{badge}</span>
				</span>
			) : null}
		</span>
	);

	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:p-1.5"
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
				{menuList.map(({ groupLabel, menus }) => {
					const groupKey = `group-${groupLabel}`;
					const isGroupOpen = getCollapsibleState(groupKey, true);

					return (
						<Collapsible
							key={groupLabel}
							open={isGroupOpen}
							onOpenChange={() => toggleCollapsible(groupKey)}
							className="group/collapsible"
						>
							<SidebarGroup>
								<SidebarGroupLabel asChild>
									<CollapsibleTrigger>
										{groupLabel}
										<IconChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
									</CollapsibleTrigger>
								</SidebarGroupLabel>
								<CollapsibleContent>
									<SidebarGroupContent>
										<SidebarMenu>
											{menus.map(
												({
													href,
													label,
													icon: Icon,
													active,
													submenus,
													badge,
												}) => {
													if (submenus.length === 0) {
														return (
															<SidebarMenuItem
																key={label}
																className="font-mono"
															>
																<SidebarMenuButton asChild isActive={active}>
																	<a href={href}>
																		<Icon />
																		{renderMenuLabel(label, badge)}
																	</a>
																</SidebarMenuButton>
															</SidebarMenuItem>
														);
													}

													const menuKey = `menu-${label}`;
													const isMenuOpen = getCollapsibleState(menuKey, true);

													return (
														<Collapsible
															key={label}
															open={isMenuOpen}
															onOpenChange={() => toggleCollapsible(menuKey)}
															className="group/collapsible"
														>
															<SidebarMenuItem>
																<CollapsibleTrigger asChild>
																	<SidebarMenuButton isActive={active}>
																		<Icon />
																		{renderMenuLabel(label, badge)}
																	</SidebarMenuButton>
																</CollapsibleTrigger>
																<CollapsibleContent>
																	<SidebarMenuSub className="pl-5">
																		{submenus.map(({ href, label, active }) => (
																			<SidebarMenuItem key={label}>
																				<SidebarMenuButton
																					asChild
																					tooltip={label}
																					isActive={active}
																				>
																					<Link href={href}>
																						<span>{label}</span>
																					</Link>
																				</SidebarMenuButton>
																			</SidebarMenuItem>
																		))}
																	</SidebarMenuSub>
																</CollapsibleContent>
															</SidebarMenuItem>
														</Collapsible>
													);
												},
											)}
										</SidebarMenu>
									</SidebarGroupContent>
								</CollapsibleContent>
							</SidebarGroup>
						</Collapsible>
					);
				})}
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton>
									<IconChevronUp className="ml-auto" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="top"
								className="w-[--radix-popper-anchor-width]"
							>
								<DropdownMenuItem asChild>
									<Link
										className="flex items-center gap-1"
										title={t("back_to_store")}
										href={`/${store.id}`}
									>
										<IconHome />
										{store.name}
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<div className="flex">
										<IconHelp />
										<Link className="flex items-center gap-1" href={"/help"}>
											{t("Help")}
										</Link>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<SignOutButton />
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}

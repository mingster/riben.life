"use client";

import {
	ChevronDown,
	ChevronUp,
	FileQuestion,
	HomeIcon,
	LogOut,
} from "lucide-react";

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
	SidebarMenuSubItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/auth-client";

import { useTranslation } from "@/app/i18n/client";
import { StoreModal } from "@/app/storeAdmin/(root)/store-modal";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useI18n } from "@/providers/i18n-provider";
import type { Store } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GetMenuList } from "./menu-list";
import StoreSwitcher from "./store-switcher";

interface prop {
	store: Store;
}

//export function StoreAdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
export function StoreAdminSidebar({ store }: prop) {
	//console.log('store', JSON.stringify(store));
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "storeAdmin");

	const pathname = usePathname();
	const menuList = GetMenuList(store, pathname);

	/**
	 
		{
			groupLabel: t("Help"),
			menus: [
				{
					href: `${nav_prefix}/help`,
					label: t("QandA"),
					active: pathname.includes(`${nav_prefix}/help`),
					icon: FileQuestion,
					submenus: [],
				},
			],
		},
	 */
	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<Link href="/siteAdmin">
								<span className="text-base font-semibold">Store Admin</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>

					<SidebarMenuItem className="font-mono">
						<StoreSwitcher />
						<StoreModal />
						{/* storeModal is to create new store when switcher's create store is clicked */}
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{menuList.map(({ groupLabel, menus }) => (
					<Collapsible
						key={groupLabel}
						defaultOpen
						className="group/collapsible"
					>
						<SidebarGroup>
							<SidebarGroupLabel asChild>
								<CollapsibleTrigger>
									{groupLabel}
									<ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
								</CollapsibleTrigger>
							</SidebarGroupLabel>
							<CollapsibleContent>
								<SidebarGroupContent>
									<SidebarMenu>
										{menus.map(
											({ href, label, icon: Icon, active, submenus }) =>
												submenus.length === 0 ? (
													<SidebarMenuItem key={label}>
														<SidebarMenuButton asChild isActive={active}>
															<a href={href}>
																<Icon />
																<span>{label}</span>
															</a>
														</SidebarMenuButton>
													</SidebarMenuItem>
												) : (
													<Collapsible
														key={label}
														defaultOpen
														className="group/collapsible"
													>
														<SidebarMenuItem>
															<CollapsibleTrigger asChild>
																<SidebarMenuButton isActive={active}>
																	<Icon />
																	<span>{label}</span>
																</SidebarMenuButton>
															</CollapsibleTrigger>
															<CollapsibleContent>
																<SidebarMenuSub className="pl-5">
																	{submenus.map(({ href, label, active }) => (
																		<SidebarMenuSubItem key={label}>
																			<a href={href}>
																				<span>{label}</span>
																			</a>
																		</SidebarMenuSubItem>
																	))}
																</SidebarMenuSub>
															</CollapsibleContent>
														</SidebarMenuItem>
													</Collapsible>
												),
										)}
									</SidebarMenu>
								</SidebarGroupContent>
							</CollapsibleContent>
						</SidebarGroup>
					</Collapsible>
				))}
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton>
									<ChevronUp className="ml-auto" />
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
										<HomeIcon />
										{store.name}
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<div className="flex">
										<FileQuestion />
										<Link className="flex items-center gap-1" href={"/help"}>
											{t("Help")}
										</Link>
									</div>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Button
										onClick={() => signOut({ callbackUrl: "/" })}
										variant="outline"
										className="mt-5 h-10 w-full justify-center"
									>
										<span className="mr-4">
											<LogOut size={18} />
										</span>
										<p className="whitespace-nowrap">Sign out</p>
									</Button>
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

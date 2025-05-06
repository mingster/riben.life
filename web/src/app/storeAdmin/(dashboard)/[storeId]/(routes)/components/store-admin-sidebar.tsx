"use client";

import {
	Calendar,
	ChevronDown,
	ChevronUp,
	Home,
	Inbox,
	LogOut,
	Search,
	Settings,
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
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarRail,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { signOut } from "next-auth/react";

import { StoreModal } from "@/app/storeAdmin/(root)/store-modal";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Store } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GetMenuList } from "./menu-list";
import StoreSwitcher from "./store-switcher";

interface prop {
	store: Store;
}
export function StoreAdminSidebar({ store }: prop) {
	//console.log('store', JSON.stringify(store));

	const pathname = usePathname();
	const menuList = GetMenuList(store, pathname);

	return (
		<Sidebar variant="sidebar" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem className="font-mono">
						<StoreSwitcher />
						<StoreModal />
						{/* stpreModal is to create new store when switcher's create store is clicked */}
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
								<DropdownMenuItem>
									<span>
										<Link href="/">HOME</Link>
									</span>
								</DropdownMenuItem>
								<DropdownMenuItem>
									<span>MOCKUP</span>
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

"use client";

import { ChevronDown, ChevronUp, LogOut } from "lucide-react";

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
	useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GetMenuList } from "./admin-menu-list";

export function AdminSidebar() {
	const pathname = usePathname();
	const menuList = GetMenuList(pathname);

	const { setOpen } = useSidebar();

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

	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							asChild
							className="data-[slot=sidebar-menu-button]:!p-1.5"
						>
							<Link href="/admin">
								<span className="text-base font-semibold">Admin</span>
							</Link>
						</SidebarMenuButton>
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

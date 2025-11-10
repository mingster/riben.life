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
import type { Store } from "@/types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
	const { open } = useSidebar();

	const pathname = usePathname();
	const menuList = GetMenuList(store, pathname);

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
						></SidebarMenuButton>
					</SidebarMenuItem>

					{open && (
						<SidebarMenuItem className="font-mono">
							<StoreSwitcher />
							<StoreModal />
							{/* storeModal is to create new store when switcher's create store is clicked */}
						</SidebarMenuItem>
					)}
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
									<IconChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
								</CollapsibleTrigger>
							</SidebarGroupLabel>
							<CollapsibleContent>
								<SidebarGroupContent>
									<SidebarMenu>
										{menus.map(
											({ href, label, icon: Icon, active, submenus }) =>
												submenus.length === 0 ? (
													<SidebarMenuItem key={label} className="font-mono">
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
																		<SidebarMenuItem key={label}>
																			<SidebarMenuButton
																				tooltip={label}
																				isActive={active}
																			>
																				<span>{label}</span>
																			</SidebarMenuButton>
																		</SidebarMenuItem>
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

"use client";

import type { ReactNode } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import Link from "next/link";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
} from "@/components/ui/sidebar";
import type { StoreAdminMenuGroup } from "./menu-list";
import { cn } from "@/lib/utils";

interface StoreAdminNavContentProps {
	menuList: StoreAdminMenuGroup[];
	isMounted: boolean;
	getCollapsibleState: (key: string, defaultValue?: boolean) => boolean;
	toggleCollapsible: (key: string) => void;
	renderMenuLabel: (text: string, badge?: number) => ReactNode;
	menuButtonTouchClass: string;
	groupLabelTouchClass: string;
	className?: string;
}

/**
 * Shared collapsible admin navigation groups for the sidebar (desktop + mobile sheet).
 */
export function StoreAdminNavContent({
	menuList,
	isMounted,
	getCollapsibleState,
	toggleCollapsible,
	renderMenuLabel,
	menuButtonTouchClass,
	groupLabelTouchClass,
	className,
}: StoreAdminNavContentProps) {
	return (
		<div className={cn(className)}>
			{!isMounted
				? menuList.map(({ groupLabel, menus }) => (
						<SidebarGroup key={groupLabel}>
							<SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{menus.map(
										({ label, icon: Icon, active, href, submenus, badge }) =>
											submenus.length === 0 ? (
												<SidebarMenuItem key={label} className="font-mono">
													<SidebarMenuButton
														asChild
														isActive={active}
														className={menuButtonTouchClass}
													>
														<a href={href}>
															<Icon />
															{renderMenuLabel(label, badge)}
														</a>
													</SidebarMenuButton>
												</SidebarMenuItem>
											) : (
												<SidebarMenuItem key={label}>
													<SidebarMenuButton
														isActive={active}
														className={menuButtonTouchClass}
													>
														<Icon />
														{renderMenuLabel(label, badge)}
													</SidebarMenuButton>
													<SidebarMenuSub className="pl-5 gap-0.5 sm:gap-0">
														{submenus.map(
															({
																href: subHref,
																label: subLabel,
																active: subActive,
															}) => (
																<SidebarMenuItem key={subLabel}>
																	<SidebarMenuButton
																		asChild
																		tooltip={subLabel}
																		isActive={subActive}
																		className={menuButtonTouchClass}
																	>
																		<Link href={subHref}>
																			<span>{subLabel}</span>
																		</Link>
																	</SidebarMenuButton>
																</SidebarMenuItem>
															),
														)}
													</SidebarMenuSub>
												</SidebarMenuItem>
											),
									)}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					))
				: menuList.map(({ groupLabel, menus }) => {
						const groupKey = `group-${groupLabel}`;
						const isGroupOpen = getCollapsibleState(groupKey, true);

						return (
							<Collapsible
								key={groupLabel}
								open={isGroupOpen}
								onOpenChange={() => toggleCollapsible(groupKey)}
								className="group/collapsible"
							>
								<SidebarGroup className="p-2 sm:p-2">
									<SidebarGroupLabel asChild>
										<CollapsibleTrigger className={groupLabelTouchClass}>
											{groupLabel}
											<IconChevronDown className="ml-auto size-4 sm:size-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180" />
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
																	<SidebarMenuButton
																		asChild
																		isActive={active}
																		className={menuButtonTouchClass}
																	>
																		<a href={href}>
																			<Icon />
																			{renderMenuLabel(label, badge)}
																		</a>
																	</SidebarMenuButton>
																</SidebarMenuItem>
															);
														}

														const menuKey = `menu-${label}`;
														const isMenuOpen = getCollapsibleState(
															menuKey,
															true,
														);

														return (
															<Collapsible
																key={label}
																open={isMenuOpen}
																onOpenChange={() => toggleCollapsible(menuKey)}
																className="group/collapsible"
															>
																<SidebarMenuItem>
																	<CollapsibleTrigger asChild>
																		<SidebarMenuButton
																			isActive={active}
																			className={menuButtonTouchClass}
																		>
																			<Icon />
																			{renderMenuLabel(label, badge)}
																		</SidebarMenuButton>
																	</CollapsibleTrigger>
																	<CollapsibleContent>
																		<SidebarMenuSub className="pl-5 gap-0.5 sm:gap-0">
																			{submenus.map(
																				({
																					href: subHref,
																					label: subLabel,
																					active: subActive,
																				}) => (
																					<SidebarMenuItem key={subLabel}>
																						<SidebarMenuButton
																							asChild
																							tooltip={subLabel}
																							isActive={subActive}
																							className={menuButtonTouchClass}
																						>
																							<Link href={subHref}>
																								<span>{subLabel}</span>
																							</Link>
																						</SidebarMenuButton>
																					</SidebarMenuItem>
																				),
																			)}
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
		</div>
	);
}

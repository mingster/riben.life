"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconChevronDown } from "@tabler/icons-react";
import { Ellipsis } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";

import { cn } from "@/utils/utils";

import { CollapseMenuButton } from "@/components/collapse-menu-button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Store } from "@/types";
import { GetMenuList } from "./store-menu-list";

interface MenuProps {
	store: Store;

	isOpen: boolean | undefined;
	title: string | undefined;
	setIsOpen?: (newValue: boolean) => void;
}

//bring to the href and close the side menu

const STORE_MENU_COLLAPSIBLE_KEY = "store-menu-collapsible";

export function StoreMenu({ store, isOpen, title, setIsOpen }: MenuProps) {
	const pathname = usePathname();
	const params = useParams<{ storeId: string }>();
	const router = useRouter();

	const [activeSpot, setActiveSpot] = useState("");
	const [isMounted, setIsMounted] = useState(false);
	const [collapsibleStates, setCollapsibleStates] = useState<
		Record<string, boolean>
	>({});

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || !isMounted) return;
		try {
			const stored = localStorage.getItem(STORE_MENU_COLLAPSIBLE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				setCollapsibleStates(parsed);
			}
		} catch {
			// Ignore localStorage errors
		}
	}, [isMounted]);

	useEffect(() => {
		if (typeof window === "undefined" || !isMounted) return;
		try {
			localStorage.setItem(
				STORE_MENU_COLLAPSIBLE_KEY,
				JSON.stringify(collapsibleStates),
			);
		} catch {
			// Ignore localStorage errors
		}
	}, [collapsibleStates, isMounted]);

	const getCollapsibleState = useCallback(
		(key: string, defaultValue = true) =>
			collapsibleStates[key] ?? defaultValue,
		[collapsibleStates],
	);

	const toggleCollapsible = useCallback((key: string) => {
		setCollapsibleStates((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	}, []);

	// Fetch customer fiat balance using SWR
	const { data: fiatBalanceData } = useSWR<{ fiat: number; currency: string }>(
		`/api/store/${params.storeId}/customer/fiat-balance`,
		async (url: string) => {
			const res = await fetch(url);
			if (!res.ok) {
				// If unauthorized or not found, return null (user not logged in or no balance)
				return null;
			}
			return res.json();
		},
		{
			revalidateOnFocus: true,
			revalidateOnReconnect: true,
		},
	);

	const fiatBalance = fiatBalanceData?.fiat ?? null;
	const fiatCurrency =
		fiatBalanceData?.currency || store.defaultCurrency || "twd";
	const menuList = GetMenuList(
		store,
		params.storeId,
		pathname,
		fiatBalance,
		fiatCurrency,
	);

	function menuClick(href: string) {
		setActiveSpot(href);

		setIsOpen?.(false);
		//close();
		router.push(href);
	}

	const _onPress = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
		e.preventDefault();
		const target = window.document.getElementById(
			e.currentTarget.href.split("#")[1],
		);
		if (target) {
			target.scrollIntoView({ behavior: "smooth" });
		}
	};

	return (
		<ScrollArea className="[&>div>div[style]]:block! touch-manipulation overflow-y-auto [-webkit-overflow-scrolling:touch]">
			<nav className="mt-0 size-full pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-2">
				{isOpen && (
					<div className="space-y-1 px-3 sm:px-4 mb-2 sm:mb-0">
						{title && (
							<p className="text-sm sm:text-base font-semibold text-foreground">
								{title}
							</p>
						)}
					</div>
				)}
				<ul className="flex min-h-[calc(100vh-48px-36px-16px-32px)] flex-col items-start space-y-2 px-3 sm:px-4 sm:space-y-1.5 lg:min-h-[calc(100vh-32px-40px-32px)]">
					{menuList.map(({ groupLabel, menus }, groupIndex) => {
						const groupKey = `group-${groupLabel}`;
						const isGroupOpen =
							!isMounted || getCollapsibleState(groupKey, true);

						const isExpanded = (isOpen && groupLabel) || isOpen === undefined;
						const isCollapsedSidebar =
							!isOpen && isOpen !== undefined && groupLabel;

						const renderMenuItems = () =>
							menus.map(
								(
									{ href, label, icon: Icon, active, submenus, badge },
									menuIndex,
								) =>
									submenus.length === 0 ? (
										<div className="w-full" key={menuIndex}>
											<TooltipProvider disableHoverableContent>
												<Tooltip delayDuration={100}>
													<TooltipTrigger asChild>
														<Button
															variant={
																active || activeSpot === href
																	? "default"
																	: "ghost"
															}
															className={cn(
																"mb-1.5 h-11 w-full justify-start px-3 py-2.5 sm:mb-1 sm:h-10 sm:min-h-0 sm:px-2 sm:py-2 touch-manipulation",
																active || activeSpot === href
																	? "text-link"
																	: "",
																"font-semibold hover:opacity-50 active:opacity-70 active:bg-muted/50",
															)}
															onClick={() => menuClick(href)}
														>
															<span
																className={cn(
																	isOpen === false ? "" : "mr-3 sm:mr-4",
																)}
															>
																<Icon className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
															</span>
															<p
																className={cn(
																	"max-w-[200px] truncate text-left text-sm sm:text-base",
																	isOpen === false
																		? "-translate-x-96 opacity-0"
																		: "translate-x-0 opacity-100",
																)}
															>
																{label}
															</p>
															{badge !== undefined && isOpen !== false && (
																<Badge
																	variant="secondary"
																	className="ml-2 shrink-0 px-1.5 py-0 text-xs font-normal sm:px-1"
																>
																	{badge}
																</Badge>
															)}
														</Button>
													</TooltipTrigger>
													{isOpen === false && (
														<TooltipContent side="right">
															{label}
														</TooltipContent>
													)}
												</Tooltip>
											</TooltipProvider>
										</div>
									) : (
										<div className="w-full" key={menuIndex}>
											<CollapseMenuButton
												icon={Icon}
												title={label}
												isCollapsed={!isOpen}
											/>
										</div>
									),
							);

						return (
							<li
								className={cn("w-full", groupLabel ? "pt-4 sm:pt-5" : "")}
								key={groupIndex}
							>
								{isExpanded && groupLabel ? (
									<Collapsible
										open={isGroupOpen}
										onOpenChange={() => toggleCollapsible(groupKey)}
										className="group/collapsible"
									>
										<CollapsibleTrigger asChild>
											<Button
												variant="ghost"
												className="flex h-11 w-full items-center justify-between px-3 py-2.5 sm:h-10 sm:min-h-0 sm:px-2 sm:py-2 touch-manipulation font-medium text-muted-foreground hover:text-foreground active:opacity-70 active:bg-muted/50"
											>
												<span className="max-w-[200px] truncate text-left text-xs sm:text-sm">
													{groupLabel}
												</span>
												<IconChevronDown className="ml-auto size-5 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-180 sm:size-4" />
											</Button>
										</CollapsibleTrigger>
										<CollapsibleContent className="pt-0.5">
											{renderMenuItems()}
										</CollapsibleContent>
									</Collapsible>
								) : isCollapsedSidebar ? (
									<TooltipProvider>
										<Tooltip delayDuration={100}>
											<TooltipTrigger className="flex h-11 w-full min-h-0 items-center justify-center touch-manipulation sm:h-10">
												<div className="flex w-full items-center justify-center">
													<Ellipsis className="size-5 sm:size-5" />
												</div>
											</TooltipTrigger>
											<TooltipContent side="right">
												<p>{groupLabel}</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
								) : groupLabel ? (
									<p className="pb-2">&nbsp;</p>
								) : null}

								{!groupLabel && renderMenuItems()}
							</li>
						);
					})}
				</ul>
			</nav>
		</ScrollArea>
	);
}

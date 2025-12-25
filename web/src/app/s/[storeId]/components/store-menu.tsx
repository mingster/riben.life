"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Ellipsis } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";
import useSWR from "swr";

import { cn } from "@/utils/utils";

import { CollapseMenuButton } from "@/components/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Store } from "@/types";
import { useState } from "react";
import { GetMenuList } from "./store-menu-list";

interface MenuProps {
	store: Store;

	isOpen: boolean | undefined;
	title: string | undefined;
	setIsOpen?: (newValue: boolean) => void;
}

//bring to the href and close the side menu

export function StoreMenu({ store, isOpen, title, setIsOpen }: MenuProps) {
	const pathname = usePathname();
	const params = useParams<{ storeId: string }>();
	const router = useRouter();

	const [activeSpot, setActiveSpot] = useState("");

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
		<ScrollArea className="[&>div>div[style]]:block!">
			<nav className="mt-4 sm:mt-8 size-full">
				{isOpen && (
					<div className="space-y-1 px-2 sm:px-2 mb-2 sm:mb-0">
						{title && (
							<p className="text-sm sm:text-base font-semibold text-foreground">
								{title}
							</p>
						)}
					</div>
				)}
				<ul className="flex min-h-[calc(100vh-48px-36px-16px-32px)] flex-col items-start space-y-1 px-2 sm:px-2 lg:min-h-[calc(100vh-32px-40px-32px)]">
					{menuList.map(({ groupLabel, menus }, index) => (
						<li
							className={cn("w-full", groupLabel ? "pt-3 sm:pt-5" : "")}
							key={index}
						>
							{(isOpen && groupLabel) || isOpen === undefined ? (
								<p className="max-w-[248px] truncate px-3 sm:px-4 pb-2 sm:pb-2 text-xs sm:text-sm font-medium text-muted-foreground">
									{groupLabel}
								</p>
							) : !isOpen && isOpen !== undefined && groupLabel ? (
								<TooltipProvider>
									<Tooltip delayDuration={100}>
										<TooltipTrigger className="w-full touch-manipulation">
											<div className="flex w-full items-center justify-center">
												<Ellipsis className="size-5 sm:size-5" />
											</div>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p>{groupLabel}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : (
								<p className="pb-2">&nbsp;</p>
							)}

							{menus.map(
								(
									{ href, label, icon: Icon, active, submenus, badge },
									index,
								) =>
									submenus.length === 0 ? (
										<div className="w-full" key={index}>
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
																"mb-1 h-11 w-full justify-start px-3 sm:h-10 sm:px-2 touch-manipulation",
																active || activeSpot === href
																	? "text-link"
																	: "",
																"font-semibold hover:opacity-50 active:opacity-70",
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
																	"max-w-[200px] truncate text-sm sm:text-base",
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
																	className="ml-2 shrink-0 text-xs font-normal"
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
										<div className="w-full" key={index}>
											<CollapseMenuButton
												icon={Icon}
												title={label}
												isCollapsed={!isOpen}
											/>
										</div>
									),
							)}
						</li>
					))}
				</ul>
			</nav>
		</ScrollArea>
	);
}

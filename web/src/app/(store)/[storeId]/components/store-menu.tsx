"use client";

import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Ellipsis } from "lucide-react";
import { useParams, usePathname, useRouter } from "next/navigation";

import { cn } from "@/utils/utils";

import { CollapseMenuButton } from "@/components/collapse-menu-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Store } from "@/types";
import { useState } from "react";
import { GetMenuList } from "./store-menu-list";
import { ThemeToggler } from "@/components/theme-toggler";
import DropdownUser from "@/components/auth/dropdown-user";
import { LanguageToggler } from "@/components/language-toggler";

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
	const menuList = GetMenuList(store, params.storeId, pathname);
	const router = useRouter();

	const [activeSpot, setActiveSpot] = useState("");

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
		<ScrollArea className="[&>div>div[style]]:!block">
			<nav className="mt-8 size-full ">
				{isOpen && <div className="space-y-1 px-2">{title}</div>}
				<ul className="flex min-h-[calc(100vh-48px-36px-16px-32px)] flex-col items-start space-y-1 px-2 lg:min-h-[calc(100vh-32px-40px-32px)]">
					{menuList.map(({ groupLabel, menus }, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<li className={cn("w-full", groupLabel ? "pt-5" : "")} key={index}>
							{(isOpen && groupLabel) || isOpen === undefined ? (
								<p className="max-w-[248px] truncate px-4 pb-2 text-sm font-medium text-muted-foreground">
									{groupLabel}
								</p>
							) : !isOpen && isOpen !== undefined && groupLabel ? (
								<TooltipProvider>
									<Tooltip delayDuration={100}>
										<TooltipTrigger className="w-full">
											<div className="flex w-full items-center justify-center">
												<Ellipsis className="size-5" />
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
								({ href, label, icon: Icon, active, submenus }, index) =>
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
															className="mb-1 h-11 min-h-[44px] w-full justify-start sm:h-10 sm:min-h-0 touch-manipulation"
															asChild
														>
															<Button
																className={cn(
																	active || activeSpot === href
																		? "text-link"
																		: "",
																	"font-semibold hover:opacity-50 active:opacity-70",
																)}
																onClick={() => menuClick(href)}
															>
																<span
																	className={cn(isOpen === false ? "" : "mr-4")}
																>
																	<Icon size={18} />
																</span>
																<p
																	className={cn(
																		"max-w-[200px] truncate",
																		isOpen === false
																			? "-translate-x-96 opacity-0"
																			: "translate-x-0 opacity-100",
																	)}
																>
																	{label}
																</p>
															</Button>
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

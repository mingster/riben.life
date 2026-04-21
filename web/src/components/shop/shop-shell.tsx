"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/app/i18n/client";
import DropdownUser from "@/components/auth/dropdown-user";
import { DropdownCart } from "@/components/dropdown-cart";
import { LanguageToggler } from "@/components/language-toggler";
import { Logo } from "@/components/logo";
import { ShopCartMetadata } from "@/components/shop/shop-cart-metadata";
import { SiteFooter } from "@/components/site-footer";
import { ThemeToggler } from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import type { ShopNavCategory } from "@/lib/shop/nav-types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

const mobileNavLinkClass =
	"flex h-11 w-full items-center rounded-md px-3 text-sm font-medium text-foreground touch-manipulation transition-colors hover:bg-accent hover:text-accent-foreground";

export function ShopShell({
	storeId,
	categories,
	showOwnerPickupLink = false,
	children,
	className,
}: {
	storeId: string;
	/** From `Category` only — order matches `sortOrder` from the server. */
	categories: ShopNavCategory[];
	/** Default-store owner: link to click & collect dashboard. */
	showOwnerPickupLink?: boolean;
	children: React.ReactNode;
	className?: string;
}) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");

	return (
		<div className={cn("flex min-h-screen flex-col bg-background", className)}>
			<ShopCartMetadata storeId={storeId} />
			<header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
					<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-5">
						<Link
							href="/"
							className="hidden shrink-0 items-center gap-2 text-sm font-medium tracking-tight md:flex"
							aria-label={t("shop_shell_home_aria")}
						>
							<Logo className="h-6 w-auto" />
						</Link>

						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<SheetTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="shrink-0 touch-manipulation md:hidden"
									aria-label={t("shop_shell_menu_aria")}
								>
									<IconDotsVertical className="size-5 text-muted-foreground" />
								</Button>
							</SheetTrigger>
							<SheetContent
								side="right"
								className="flex w-full flex-col gap-0 p-0 sm:max-w-sm"
							>
								<SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
									<SheetTitle className=" text-lg font-light tracking-tight">
										{t("shop_shell_menu_title")}
									</SheetTitle>
								</SheetHeader>
								<nav
									className="flex flex-1 flex-col overflow-y-auto px-2 py-3"
									aria-label={t("shop_shell_menu_aria")}
								>
									<SheetClose asChild>
										<Link href="/" className={mobileNavLinkClass}>
											{t("shop_shell_nav_home")}
										</Link>
									</SheetClose>
									<SheetClose asChild>
										<Link
											href={`/shop/${storeId}`}
											className={mobileNavLinkClass}
										>
											{t("shop_shell_nav_shop")}
										</Link>
									</SheetClose>
									<SheetClose asChild>
										<Link
											href={`/shop/${storeId}/cart`}
											className={mobileNavLinkClass}
										>
											{t("shop_shell_nav_bag")}
										</Link>
									</SheetClose>
									<SheetClose asChild>
										<Link
											href={`/shop/${storeId}/saved`}
											className={mobileNavLinkClass}
										>
											{t("shop_shell_nav_saved")}
										</Link>
									</SheetClose>
									<SheetClose asChild>
										<Link
											href={`/shop/${storeId}/locations`}
											className={mobileNavLinkClass}
										>
											{t("shop_shell_nav_locations")}
										</Link>
									</SheetClose>
									<SheetClose asChild>
										<Link
											href={`/shop/${storeId}/help`}
											className={mobileNavLinkClass}
										>
											{t("shop_shell_nav_help")}
										</Link>
									</SheetClose>
									{showOwnerPickupLink ? (
										<SheetClose asChild>
											<Link
												href={`/shop/${storeId}/owner/pickups`}
												className={mobileNavLinkClass}
											>
												{t("shop_shell_nav_pickups")}
											</Link>
										</SheetClose>
									) : null}
									<SheetClose asChild>
										<Link href="/about" className={mobileNavLinkClass}>
											{t("shop_shell_nav_about")}
										</Link>
									</SheetClose>

									{categories.length > 0 ? (
										<div className="mt-4 border-t border-border/60 pt-4">
											<p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
												{t("shop_shell_collections_heading")}
											</p>
											<SheetClose asChild>
												<Link
													href={`/shop/${storeId}`}
													className={mobileNavLinkClass}
												>
													{t("shop_shell_nav_all")}
												</Link>
											</SheetClose>
											{categories.length >= 2
												? categories.map((c) => (
														<SheetClose asChild key={c.id}>
															<Link
																href={`/shop/${storeId}/c/${c.id}`}
																className={mobileNavLinkClass}
																title={c.name}
															>
																<span className="truncate">{c.name}</span>
															</Link>
														</SheetClose>
													))
												: null}
										</div>
									) : null}
								</nav>
							</SheetContent>
						</Sheet>

						<nav
							className="hidden min-w-0 items-center gap-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground md:flex"
							aria-label={t("shop_shell_collections_nav_aria")}
						>
							<Link
								href={`/shop/${storeId}`}
								className="shrink-0 px-2 py-1.5 transition-colors hover:text-foreground"
							>
								{t("shop_shell_nav_all")}
							</Link>
							{categories.length >= 2
								? categories.map((c) => (
										<Link
											key={c.id}
											href={`/shop/${storeId}/c/${c.id}`}
											className="max-w-40 truncate px-2 py-1.5 transition-colors hover:text-foreground"
											title={c.name}
										>
											{c.name}
										</Link>
									))
								: null}
						</nav>

						<nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
							<Link
								href={`/shop/${storeId}/saved`}
								className="hover:text-foreground"
							>
								{t("shop_shell_nav_saved")}
							</Link>

							{showOwnerPickupLink ? (
								<Link
									href={`/shop/${storeId}/owner/pickups`}
									className="hover:text-foreground"
								>
									{t("shop_shell_nav_pickups")}
								</Link>
							) : null}
							<Link href="/about" className="hover:text-foreground">
								{t("shop_shell_nav_about")}
							</Link>
						</nav>
					</div>
					<div className="flex items-center gap-0 sm:gap-1">
						<ThemeToggler />
						<LanguageToggler />
						<DropdownCart />
						<DropdownUser callbackUrl={`/shop/${storeId}`} />
					</div>
				</div>
			</header>
			{categories.length >= 2 && (
				<div className="border-b border-border/40 bg-muted/20 md:hidden">
					<div className="mx-auto max-w-6xl px-3 py-2 sm:px-4">
						<p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
							{t("shop_shell_collections_heading")}
						</p>
						<ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
							<li className="shrink-0">
								<Link
									href={`/shop/${storeId}`}
									className="inline-flex rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
								>
									{t("shop_shell_nav_all")}
								</Link>
							</li>
							{categories.map((c) => (
								<li key={c.id} className="shrink-0">
									<Link
										href={`/shop/${storeId}/c/${c.id}`}
										className="inline-flex max-w-[200px] truncate rounded-full border border-border/60 bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
										title={c.name}
									>
										{c.name}
									</Link>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}
			<main className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
				{children}
			</main>
			<SiteFooter className="mt-auto hidden md:block" />
		</div>
	);
}

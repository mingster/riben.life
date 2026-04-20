"use client";

import { IconDotsVertical } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { useTranslation } from "@/app/i18n/client";
import DropdownUser from "@/components/auth/dropdown-user";
import { DropdownCart } from "@/components/dropdown-cart";
import { ThemeToggler } from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { shopPathWithDefaultStore } from "@/lib/shop/shop-nav-paths";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";
import DialogSignIn from "./auth/dialog-sign-in";
import { BackgroundImage } from "./BackgroundImage";
import { LanguageToggler } from "./language-toggler";
import { Logo } from "./logo";

const mobileNavLinkClass =
	"flex h-11 w-full items-center rounded-md px-3 text-sm font-medium text-foreground touch-manipulation transition-colors hover:bg-accent hover:text-accent-foreground";

interface NavbarProps {
	title: string;
}

export function GlobalNavbar({ title }: NavbarProps) {
	const [mounted, setMounted] = useState(false);
	const { data: session } = authClient.useSession();
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return (
			<header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
				<div
					className="mx-auto flex h-[52px] max-w-6xl items-center justify-center px-3 sm:px-4 lg:px-6"
					role="status"
					aria-live="polite"
					aria-busy
				>
					<span className="sr-only">{t("shop_loading_shop_aria")}</span>
					<ClipLoader size={22} color="var(--muted-foreground)" />
				</div>
			</header>
		);
	}

	return (
		<>
			<BackgroundImage />
			<header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
				<div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 lg:px-6">
					<div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
						<Link
							href="/"
							className="mr-1 flex shrink-0 items-center md:mr-2"
							aria-label={t("shop_shell_home_aria")}
							onContextMenu={(e) => {
								e.preventDefault();
							}}
						>
							<Logo className="h-6 w-auto" />
						</Link>
						<h1 className="truncate font-serif text-base font-light tracking-tight text-foreground sm:text-lg">
							{title}
						</h1>
					</div>

					<div className="flex shrink-0 items-center gap-1 sm:gap-2">
						<nav
							className="hidden items-center gap-1 border-r border-border/60 pr-3 text-sm text-muted-foreground lg:flex"
							aria-label={t("shop_shell_menu_title")}
						>
							<Link
								href="/shop"
								className="px-2 py-1.5 transition-colors hover:text-foreground"
							>
								{t("shop_shell_nav_shop")}
							</Link>
							<Link
								href={shopPathWithDefaultStore("/saved")}
								className="px-2 py-1.5 transition-colors hover:text-foreground"
							>
								{t("shop_shell_nav_saved")}
							</Link>
							<Link
								href="/about"
								className="px-2 py-1.5 transition-colors hover:text-foreground"
							>
								{t("shop_shell_nav_about")}
							</Link>
							<Link
								href="/faq"
								className="px-2 py-1.5 transition-colors hover:text-foreground"
							>
								{t("shop_shell_nav_faq")}
							</Link>
						</nav>

						<div className="flex items-center gap-0 sm:gap-1">
							<ThemeToggler />
							<LanguageToggler />
							<DropdownCart />
							{session !== null ? (
								<DropdownUser callbackUrl="/" />
							) : (
								<DialogSignIn />
							)}
							<NavPopover className="-my-1 shrink-0" display="lg:hidden" />
						</div>
					</div>
				</div>
			</header>
		</>
	);
}

export function NavPopover({
	display = "lg:hidden",
	className,
	...props
}: {
	display?: string;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
	const [isOpen, setIsOpen] = useState(false);
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");

	const mainLinks = [
		{ href: "/", labelKey: "shop_shell_nav_home" as const },
		{ href: "/shop", labelKey: "shop_shell_nav_shop" as const },
		{
			href: shopPathWithDefaultStore("/cart"),
			labelKey: "shop_shell_nav_bag" as const,
		},
		{
			href: shopPathWithDefaultStore("/saved"),
			labelKey: "shop_shell_nav_saved" as const,
		},
		{
			href: shopPathWithDefaultStore("/locations"),
			labelKey: "shop_shell_nav_locations" as const,
		},
		{
			href: shopPathWithDefaultStore("/help"),
			labelKey: "shop_shell_nav_help" as const,
		},
		{ href: "/about", labelKey: "shop_shell_nav_about" as const },
		{ href: "/faq", labelKey: "shop_shell_nav_faq" as const },
		{ href: "/contact", labelKey: "shop_shell_nav_contact" as const },
	];

	return (
		<div className={cn(className, display)} {...props}>
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="touch-manipulation"
						aria-label={t("shop_shell_menu_aria")}
					>
						<IconDotsVertical className="size-5 text-muted-foreground" />
					</Button>
				</SheetTrigger>
				<SheetContent
					side="right"
					className="flex w-full flex-col gap-0 border-border/60 p-0 sm:max-w-sm"
				>
					<SheetHeader className="border-b border-border/60 px-4 py-4 text-left">
						<SheetTitle className="font-serif text-lg font-light tracking-tight">
							{t("shop_shell_menu_title")}
						</SheetTitle>
						<SheetDescription className="sr-only">
							{t("shop_shell_menu_aria")}
						</SheetDescription>
					</SheetHeader>

					<nav
						className="flex flex-1 flex-col overflow-y-auto px-2 py-3"
						aria-label={t("shop_shell_menu_aria")}
					>
						<ul className="space-y-0">
							{mainLinks.map((item) => (
								<li key={item.href}>
									<SheetClose asChild>
										<Link
											href={item.href}
											className={mobileNavLinkClass}
											onClick={() => setIsOpen(false)}
										>
											{t(item.labelKey)}
										</Link>
									</SheetClose>
								</li>
							))}
						</ul>
						<ul className="mt-4 space-y-0 border-t border-border/60 pt-4">
							<li>
								<SheetClose asChild>
									<Link
										href="/privacy"
										className={cn(
											mobileNavLinkClass,
											"text-xs uppercase tracking-widest text-muted-foreground",
										)}
										onClick={() => setIsOpen(false)}
									>
										{t("shop_shell_nav_privacy")}
									</Link>
								</SheetClose>
							</li>
							<li>
								<SheetClose asChild>
									<Link
										href="/terms"
										className={cn(
											mobileNavLinkClass,
											"text-xs uppercase tracking-widest text-muted-foreground",
										)}
										onClick={() => setIsOpen(false)}
									>
										{t("shop_shell_nav_terms")}
									</Link>
								</SheetClose>
							</li>
						</ul>
					</nav>
				</SheetContent>
			</Sheet>
		</div>
	);
}

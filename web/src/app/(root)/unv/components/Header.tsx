"use client";
import Link from "next/link";

import { Logo } from "@/components/logo";
import TypewriterComponent from "typewriter-effect";
import { Hero } from "./Hero";

import DialogSignIn from "@/components/auth/dialog-sign-in";
import DropdownUser from "@/components/auth/dropdown-user";
import { BackgroundImage } from "@/components/BackgroundImage";
import LanguageToggler from "@/components/language-toggler";
import { ThemeToggler } from "@/components/theme-toggler";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { IconHome, IconMenu2 } from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import pkg from "../../../../../package.json";

// sheet menu for mobile devices to navigate the store.
// it's visible on small screens (lg:hidden)
export function NavPopover({
	display = "md:hidden",
	className,
	...props
}: {
	display?: string;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
	const [isOpen, setIsOpen] = useState(false);

	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const { data: session } = authClient.useSession();
	const user = session?.user;

	//console.log("session", session);

	const appVersion = pkg.version;
	return (
		<Sheet open={isOpen} onOpenChange={setIsOpen}>
			<SheetTrigger asChild>
				<Button
					className="h-10 w-10 border-gray/20 bg-stroke/20 hover:text-meta-1 active:bg-stroke/30 sm:h-8 sm:w-8"
					variant="outline"
					size="icon"
				>
					<IconMenu2 className="h-5 w-5 sm:h-4 sm:w-4" />
				</Button>
			</SheetTrigger>
			<SheetContent
				className="flex h-full flex-col px-3 sm:px-4 sm:w-72 backdrop-opacity-10 backdrop-invert"
				side="left"
			>
				<SheetHeader className="shrink-0 pb-2">
					<Button
						className="flex pb-2 pt-1 h-10 sm:h-auto"
						variant="link"
						asChild
					>
						<Link href={`/`} className="flex gap-2 items-center">
							<IconHome className="mr-1 h-6 w-6 sm:size-6" />
						</Link>
					</Button>
				</SheetHeader>
				<SheetTitle />
				<SheetDescription />
				<div className="flex-1 min-h-0 overflow-hidden">
					<NavItems />
				</div>
				<div className="shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2 flex-wrap">
					<ThemeToggler />
					<DropdownUser />
					<LanguageToggler />
				</div>
				<div className="shrink-0 pt-1 pb-1 sm:pb-0 items-center justify-center w-full font-mono text-sm flex flex-col">
					<Link href="/unv" className="w-full sm:w-auto">
						<Button
							variant="link"
							className="w-full text-xs font-mono dark:text-white h-10 sm:w-auto sm:h-9"
						>
							{t("system_provider")}
						</Button>
					</Link>
					<span className="text-xs text-muted-foreground font-mono shrink-0">
						{appVersion ? `v${appVersion}` : null}
					</span>
				</div>
			</SheetContent>
		</Sheet>
	);
}

const onNavlinkClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
	e.preventDefault();
	const target = window.document.getElementById(
		e.currentTarget.href.split("#")[1],
	);
	if (target) {
		target.scrollIntoView({ behavior: "smooth" });
	}
};

export function NavItems() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<>
			<li>
				<Link
					data-to-scrollspy-id="useCases"
					onClick={(e) => onNavlinkClick(e)}
					href="#useCases"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize flex items-center"
				>
					{t("nav_use_cases")}
				</Link>
			</li>

			<li>
				<Link
					data-to-scrollspy-id="features"
					onClick={(e) => onNavlinkClick(e)}
					href="#features"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize flex items-center"
				>
					{t("nav_features")}
				</Link>
			</li>

			<li>
				<Link
					data-to-scrollspy-id="cost"
					onClick={(e) => onNavlinkClick(e)}
					href="#cost"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize flex items-center"
				>
					{t("nav_price")}
				</Link>
			</li>
			{/*
      <li>
        <Link
          data-to-scrollspy-id="faq"
          onClick={(e) => onNavlinkClick(e)}
          href="#faq"
          className="hover:text-sky-500 dark:hover:text-sky-400"
        >
          常見問題
        </Link>
      </li>
       */}
			<li>
				<Link
					data-to-scrollspy-id="aboutUs"
					onClick={(e) => onNavlinkClick(e)}
					href="#aboutUs"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize flex items-center"
				>
					{t("nav_about")}
				</Link>
			</li>
			<li>
				<Link
					href="/storeAdmin/"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize flex items-center"
				>
					{t("nav_store_admin")}
				</Link>
			</li>
		</>
	);
}

export function NavBar() {
	const [isOpaque, setIsOpaque] = useState(false);
	const { data: session } = authClient.useSession();

	//const router = useRouter();
	useEffect(() => {
		const offset = 50;
		function onScroll() {
			if (!isOpaque && window.scrollY > offset) {
				setIsOpaque(true);
			} else if (isOpaque && window.scrollY <= offset) {
				setIsOpaque(false);
			}
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", onScroll);
			//window.addEventListener("scroll", onScroll, { passive: true } as any);
		};
	}, [isOpaque]);

	return (
		<>
			{/* background image
			 */}
			<BackgroundImage />

			{/* navbar */}

			<div
				className={clsx(
					"sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 lg:border-b lg:border-slate-900/10 dark:border-slate-50/[0.06]",
					isOpaque
						? "bg-transparent supports-backdrop-blur:bg-white/95 dark:bg-gray-900/5"
						: "bg-primary/20 supports-backdrop-blur:bg-white/60 dark:bg-gray-900/50",
				)}
			>
				<div className="mx-auto max-w-8xl">
					<div
						className={clsx(
							"py-3 sm:py-4 border-b border-slate-900/10 lg:px-8 lg:border-0 dark:border-slate-300/10 mx-3 sm:mx-4 lg:mx-0",
						)}
					>
						<div className="relative flex items-center justify-between gap-2">
							{/* display popover on mobile */}
							<NavPopover className="ml-1 sm:ml-2 -my-1" display="lg:hidden" />

							<Link
								href="#top"
								className="mr-2 sm:mr-3 flex-none w-8.25 overflow-hidden md:w-auto flex items-center"
								onContextMenu={(e) => {
									e.preventDefault();
									//router.push("/");
								}}
							>
								<span className="sr-only">home page</span>
								<Logo className="w-auto" />
							</Link>

							<div className="relative items-center hidden ml-auto lg:flex">
								<nav className="text-sm font-semibold leading-6 text-slate-400 dark:text-slate-200">
									<ul className="flex space-x-6 lg:space-x-8 items-center">
										<NavItems />
										<li className="flex pl-4 lg:pl-6 ml-4 lg:ml-6 items-center gap-2 border-l border-slate-200 dark:border-slate-800">
											<ThemeToggler />
											{session !== null ? <DropdownUser /> : <DialogSignIn />}
											<LanguageToggler />
										</li>
									</ul>
								</nav>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

export function Header() {
	return (
		<header className="relative">
			<span className="hash-span" id="top">
				&nbsp;
			</span>
			<div className="px-3 sm:px-4 md:px-6 lg:px-8">
				<div
					className={clsx(
						"absolute inset-0 bottom-10 bg-bottom bg-no-repeat bg-slate-50 dark:bg-[#0B1120]",
					)}
				>
					<div
						className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] dark:bg-bottom dark:border-b dark:border-slate-100/5"
						style={{
							maskImage: "linear-gradient(to bottom, transparent, black)",
							WebkitMaskImage: "linear-gradient(to bottom, transparent, black)",
						}}
					/>
				</div>

				<div className="relative max-w-5xl pt-16 sm:pt-20 lg:pt-24 xl:pt-32 mx-auto">
					<h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-center text-slate-900 dark:text-white px-2">
						<TypewriterComponent
							options={{
								strings: [
									"導入線上點餐系統，",
									" 導入線上點餐系統，讓您的銷售流程更順暢。",
								],
								autoStart: true,
								loop: true,
							}}
						/>
					</h1>
					<p className="max-w-3xl mx-auto mt-4 sm:mt-6 text-base sm:text-lg text-center text-slate-600 dark:text-slate-400 px-3 sm:px-0">
						<code className="font-mono font-medium text-sky-500 dark:text-sky-400">
							沒有前置費用
						</code>
						、{" "}
						<code className="font-mono font-medium text-sky-500 dark:text-sky-400">
							增加營業額
						</code>
						、{" "}
						<code className="font-mono font-medium text-sky-500 dark:text-sky-400">
							客戶無需等待
						</code>
						、 只需手機或平版電腦，您就可以開始使用系統。
					</p>
					<div className="flex justify-center mt-6 space-x-6 text-sm sm:mt-10 px-3 sm:px-0">
						<Link
							href="/storeAdmin/"
							className="flex items-center justify-center w-full h-12 px-6 font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 active:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 sm:w-auto dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400 dark:active:bg-sky-600"
						>
							不用洽詢，立即使用
						</Link>
					</div>
				</div>
			</div>
			<Hero />
		</header>
	);
}

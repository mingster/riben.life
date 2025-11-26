"use client";
import Link from "next/link";

import { Logo } from "@/components/logo";
import TypewriterComponent from "typewriter-effect";
import { Hero } from "./Hero";

import DropdownUser from "@/components/auth/dropdown-user";
import { BackgroundImage } from "@/components/BackgroundImage";
import LanguageToggler from "@/components/language-toggler";
import { ThemeToggler } from "@/components/theme-toggler";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import clsx from "clsx";
import { useEffect, useState } from "react";
import DialogSignIn from "@/components/auth/dialog-sign-in";
import { useI18n } from "@/providers/i18n-provider";
import { useTranslation } from "react-i18next";

export function NavPopover({
	display = "md:hidden",
	className,
	...props
}: {
	display?: string;
	className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
	const [isOpen, setIsOpen] = useState(false);

	/*
  useEffect(() => {
	if (!isOpen) return;
	function handleRouteChange() {
	  setIsOpen(false);
	}
	Router.events.on("routeChangeComplete", handleRouteChange);
	return () => {
	  Router.events.off("routeChangeComplete", handleRouteChange);
	};
  }, [isOpen]);
  */
	const { data: session } = authClient.useSession();

	return (
		<div className={clsx(className, display)} {...props}>
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetTrigger asChild>
					<button
						type="button"
						className="flex items-center justify-center h-10 w-10 min-h-[44px] min-w-[44px] text-slate-500 hover:text-slate-600 active:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 dark:active:text-slate-200 touch-manipulation sm:size-8 sm:min-h-0 sm:min-w-0"
						onClick={() => setIsOpen(true)}
					>
						<span className="sr-only">Navigation</span>
						<svg
							className="h-6 w-6 sm:h-6 sm:w-6"
							fill="none"
							aria-hidden="true"
						>
							<path
								d="M12 6v.01M12 12v.01M12 18v.01M12 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm0 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</button>
				</SheetTrigger>
				<SheetContent
					className="flex h-full flex-col px-3 sm:px-4 w-64 sm:w-72 backdrop-opacity-10 opacity-80 backdrop-invert rounded-lg shadow-lg text-slate-900
          dark:text-slate-400 dark:highlight-white/5 bg-white  dark:bg-slate-800"
					side="right"
				>
					<SheetHeader />
					<SheetTitle />
					<SheetDescription />

					<div className="max-w-xs p-4 sm:p-6 text-base font-semibold top-4 right-4">
						<ul className="space-y-3 sm:space-y-6">
							<NavItems />
						</ul>
						<div className="pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-200 dark:border-slate-200/10">
							<div className="flex flex-col gap-3 sm:gap-2">
								<ThemeToggler />
								{session !== null ? <DropdownUser /> : <DialogSignIn />}
								<LanguageToggler />
							</div>
						</div>
					</div>
				</SheetContent>
			</Sheet>
		</div>
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
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
				>
					{t("nav_useCases")}
				</Link>
			</li>

			<li>
				<Link
					data-to-scrollspy-id="features"
					onClick={(e) => onNavlinkClick(e)}
					href="#features"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
				>
					{t("nav_features")}
				</Link>
			</li>

			<li>
				<Link
					data-to-scrollspy-id="cost"
					onClick={(e) => onNavlinkClick(e)}
					href="#cost"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
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
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
				>
					{t("nav_about")}
				</Link>
			</li>
			<li>
				<Link
					href="/storeAdmin/"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
				>
					{t("nav_storeAdmin")}
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
							<Link
								href="#top"
								className="mr-2 sm:mr-3 flex-none w-[2.0625rem] overflow-hidden md:w-auto min-h-[44px] sm:min-h-0 flex items-center touch-manipulation"
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
							{/* display popover on mobile */}
							<NavPopover className="ml-1 sm:ml-2 -my-1" display="lg:hidden" />
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
							className="flex items-center justify-center w-full h-12 min-h-[48px] px-6 font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 active:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 sm:w-auto sm:min-h-[44px] dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400 dark:active:bg-sky-600 touch-manipulation"
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

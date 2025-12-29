"use client";
import clsx from "clsx";
//import { cn } from '@/lib/utils';
import DropdownUser from "@/components/auth/dropdown-user";
import { ThemeToggler } from "@/components/theme-toggler";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { useEffect, useState } from "react";
//import { useI18n } from '@/providers/i18n-provider';
//import { useTranslation } from '@/app/i18n/client';
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/providers/i18n-provider";
import { useTranslation } from "react-i18next";
import ClipLoader from "react-spinners/ClipLoader";
import pkg from "../../package.json";
import { BackgroundImage } from "./BackgroundImage";
import DialogSignIn from "./auth/dialog-sign-in";
import LanguageToggler from "./language-toggler";
import { Button } from "./ui/button";
import { IconHome, IconMenu2 } from "@tabler/icons-react";

interface NavbarProps {
	title: string;
}

// nav for mobile device
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
	//const _user = session?.user;

	//console.log("session", session);

	const appVersion = pkg.version;

	return (
		<div className={clsx(className, display)} {...props}>
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
					<div className="flex-1 min-h-0 overflow-hidden">{/*menu */}</div>
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
		</div>
	);
}

export function GlobalNavbar({ title }: NavbarProps) {
	const [mounted, setMounted] = useState(false);
	const [isOpaque, setIsOpaque] = useState(false);
	const { data: session } = authClient.useSession();
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

	useEffect(() => {
		setMounted(true);
	}, []);
	if (!mounted) return <ClipLoader />;

	/*
  if (process.env.NODE_ENV === 'development') {
	log.debug('session: ' + JSON.stringify(session));
	log.debug('user: ' + JSON.stringify(user));
  }
  */

	return (
		<>
			{/* background image*/}
			<BackgroundImage />
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
							"py-3 sm:py-4 border-b border-slate-900/10 lg:px-8 lg:border-0 dark:border-slate-300/10 px-3 sm:px-4 mx-0 lg:mx-0",
						)}
					>
						<div className="relative flex items-center justify-between">
							{/* display popover on mobile */}
							<NavPopover className="ml-2 -my-1" display="lg:hidden" />

							<Link
								href="/"
								className="mr-3 flex-none w-8.25 overflow-hidden md:w-auto"
								onContextMenu={(e) => {
									e.preventDefault();
									//router.push("/");
								}}
							>
								<span className="sr-only">home page</span>
								<IconHome className="mr-1 h-6 w-6 sm:size-6" />
							</Link>
							<h1>{title}</h1>
							<div className="relative items-center hidden ml-auto lg:flex">
								<nav className="text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
									<ul className="flex space-x-8 items-center">
										<li className="flex pl-6 ml-6 items-center border-slate-200 dark:border-slate-800">
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

"use client";
import Link from "next/link";

import { Logo } from "@/components/logo";

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

/** Sections linked from the top bar (Price / About / Contact). */
const TOP_NAV_SCROLL_SECTION_IDS = ["cost", "aboutUs", "contact"] as const;

/** Pixels from viewport top: main sticky navbar + buffer (align with marketing-in-page-nav). */
function getTopNavScrollSpyOffsetPx(): number {
	if (typeof window === "undefined") {
		return 120;
	}
	const isLg = window.matchMedia("(min-width: 1024px)").matches;
	return isLg ? 128 : 112;
}
import { useTranslation } from "react-i18next";
import pkg from "../../../../../package.json";

import { useMarketingSystem } from "./marketing-system-context";
import { cn } from "@/lib/utils";
import type { MarketingSystemId } from "./marketing-system-types";

// sheet menu for mobile devices to navigate the store.
// it's visible on small screens (lg:hidden)
export function NavPopover({
	display = "md:hidden",
	className,
	activeScrollId,
	...props
}: {
	display?: string;
	className?: string;
	/** Which in-page section (#cost / #aboutUs / #contact) is active for scroll highlighting. */
	activeScrollId: string | null;
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
					<NavItems activeScrollId={activeScrollId} />
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
					<Link
						href="/privacy"
						className="text-xs text-muted-foreground font-mono shrink-0"
					>
						{t("privacy_policy")}
					</Link>
					<Link
						href="/terms"
						className="text-xs text-muted-foreground font-mono shrink-0"
					>
						{t("terms_of_service")}
					</Link>
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

const SYSTEM_NAV: { id: MarketingSystemId; labelKey: string }[] = [
	{ id: "order", labelKey: "nav_order" },
	{ id: "rsvp", labelKey: "nav_rsvp" },
	{ id: "waitlist", labelKey: "nav_waitlist" },
];

/** In-page anchors: Price / About / Contact (overview/features/use cases use marketing-in-page-nav). */
const SCROLL_NAV: { href: string; labelKey: string }[] = [
	{ href: "#cost", labelKey: "nav_price" },
	{ href: "#aboutUs", labelKey: "nav_about" },
	{ href: "#contact", labelKey: "nav_contact" },
];

export function NavItems({
	activeScrollId,
}: {
	activeScrollId: string | null;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { activeSystem, setActiveSystem } = useMarketingSystem();

	return (
		<>
			{SYSTEM_NAV.map(({ id, labelKey }) => (
				<li key={id}>
					<button
						type="button"
						aria-pressed={activeSystem === id}
						onClick={() => {
							setActiveSystem(id);
							document.getElementById("top")?.scrollIntoView({
								behavior: "smooth",
								block: "start",
							});
						}}
						className={cn(
							"block w-full py-2 text-left sm:py-1 capitalize touch-manipulation",
							activeSystem === id
								? "text-sky-500 dark:text-sky-400 font-semibold"
								: "hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300",
						)}
					>
						{t(labelKey)}
					</button>
				</li>
			))}

			{SCROLL_NAV.map(({ href, labelKey }) => {
				const sectionId = href.slice(1);
				const isScrollActive = activeScrollId === sectionId;
				return (
					<li key={href}>
						<Link
							href={href}
							aria-current={isScrollActive ? "location" : undefined}
							onClick={(e) => onNavlinkClick(e)}
							className={cn(
								"block py-2 sm:py-1 capitalize items-center transition-colors",
								isScrollActive
									? "text-sky-500 dark:text-sky-400 font-semibold"
									: "hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300",
							)}
						>
							{t(labelKey)}
						</Link>
					</li>
				);
			})}

			<li>
				<Link
					href="/storeAdmin/"
					className="block py-2 sm:py-1 hover:text-sky-500 dark:hover:text-sky-400 active:text-sky-600 dark:active:text-sky-300 capitalize items-center"
				>
					{t("nav_store_admin")}
				</Link>
			</li>
		</>
	);
}

export function NavBar() {
	const [isOpaque, setIsOpaque] = useState(false);
	const [activeScrollId, setActiveScrollId] = useState<string | null>(null);
	const { data: session } = authClient.useSession();
	const { activeSystem } = useMarketingSystem();

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
			// window.addEventListener("scroll", onScroll, { passive: true });
		};
	}, [isOpaque]);

	/** Highlight Price / About / Contact in the top nav based on scroll position. */
	useEffect(() => {
		const updateActiveFromScroll = () => {
			const line = getTopNavScrollSpyOffsetPx();
			let current: string | null = null;
			for (const id of TOP_NAV_SCROLL_SECTION_IDS) {
				const el = document.getElementById(id);
				if (!el) {
					continue;
				}
				if (el.getBoundingClientRect().top <= line) {
					current = id;
				}
			}
			setActiveScrollId((prev) => (prev === current ? prev : current));
		};

		const frame = requestAnimationFrame(() => updateActiveFromScroll());
		window.addEventListener("scroll", updateActiveFromScroll, {
			passive: true,
		});
		window.addEventListener("resize", updateActiveFromScroll, {
			passive: true,
		});
		updateActiveFromScroll();

		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("scroll", updateActiveFromScroll);
			window.removeEventListener("resize", updateActiveFromScroll);
		};
	}, [activeSystem]);

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
							<NavPopover
								className="ml-1 sm:ml-2 -my-1"
								display="lg:hidden"
								activeScrollId={activeScrollId}
							/>

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
										<NavItems activeScrollId={activeScrollId} />
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

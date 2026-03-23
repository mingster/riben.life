"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/providers/i18n-provider";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import { useMarketingSystem } from "./marketing-system-context";

const IN_PAGE_ANCHORS: { href: string; labelKey: string }[] = [
	{ href: "#description", labelKey: "nav_description" },
	{ href: "#features", labelKey: "nav_features" },
	{ href: "#useCases", labelKey: "nav_use_cases" },
];

const SECTION_IDS = ["description", "features", "useCases"] as const;
type SectionId = (typeof SECTION_IDS)[number];

/** Pixels from viewport top: main sticky navbar (~56–64px) + small buffer for scroll-spy line */
function getScrollSpyOffsetPx(): number {
	if (typeof window === "undefined") {
		return 120;
	}
	const isLg = window.matchMedia("(min-width: 1024px)").matches;
	return isLg ? 128 : 112;
}

interface MarketingInPageNavProps {
	/** Merged onto the root `<nav>` (e.g. overlap positioning with hero). */
	className?: string;
}

/**
 * Secondary nav for the three marketing sections (not in the top bar).
 * Sticks below the main navbar while scrolling; highlights the section in view.
 */
export function MarketingInPageNav({ className }: MarketingInPageNavProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { activeSystem } = useMarketingSystem();

	const [activeId, setActiveId] = useState<SectionId>(SECTION_IDS[0]);

	const updateActiveFromScroll = useCallback(() => {
		const offset = getScrollSpyOffsetPx();
		let current: SectionId = SECTION_IDS[0];
		for (const id of SECTION_IDS) {
			const el = document.getElementById(id);
			if (!el) {
				continue;
			}
			const top = el.getBoundingClientRect().top;
			if (top <= offset) {
				current = id;
			}
		}
		setActiveId(current);
	}, []);

	useEffect(() => {
		setActiveId(SECTION_IDS[0]);
		const frame = requestAnimationFrame(() => updateActiveFromScroll());
		return () => cancelAnimationFrame(frame);
	}, [activeSystem, updateActiveFromScroll]);

	useEffect(() => {
		const onScroll = () => updateActiveFromScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll, { passive: true });
		onScroll();
		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [updateActiveFromScroll]);

	const scrollToSection = useCallback((id: SectionId) => {
		setActiveId(id);
		document.getElementById(id)?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}, []);

	return (
		<nav
			className={cn(
				"sticky top-14 z-35 w-full bg-background/95 py-1.5  lg:top-16",
				className,
			)}
			aria-label={t("marketing_in_page_nav_aria")}
		>
			<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-1 px-3 sm:gap-2 sm:px-4 sm:py-0.5">
				{IN_PAGE_ANCHORS.map(({ href, labelKey }) => {
					const id = href.slice(1);
					const isActive = activeId === id;
					return (
						<Link
							key={href}
							href={href}
							aria-current={isActive ? "location" : undefined}
							onClick={(e) => {
								e.preventDefault();
								scrollToSection(id as SectionId);
							}}
							className={cn(
								"inline-flex h-10 min-h-10 touch-manipulation items-center justify-center rounded-full border px-3 text-xs font-medium shadow-md transition-colors sm:h-9 sm:min-h-9 sm:px-4 sm:text-sm",
								isActive
									? "border-sky-500 bg-background text-sky-600 shadow-[0_0_14px_rgba(14,165,233,0.35)] ring-2 ring-sky-500/40 dark:text-sky-400"
									: "border-border/80 bg-background/90 text-foreground hover:bg-muted/80 dark:hover:bg-muted/50",
							)}
						>
							{t(labelKey)}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}

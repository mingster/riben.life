"use client";

import Link from "next/link";
import { useTranslation } from "@/app/i18n/client";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

interface SiteFooterProps {
	className?: string;
}

/**
 * Shared legal / discovery links for D2C public pages and shop shell.
 * Uses the `shop` i18n namespace (same as shop shell nav).
 */
export function SiteFooter({ className }: SiteFooterProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "shop");
	const year = new Date().getFullYear();

	return (
		<footer
			className={cn(
				"border-t border-border/60 bg-background/90 text-muted-foreground",
				className,
			)}
		>
			<div className="mx-auto max-w-6xl px-3 py-8 sm:px-4 lg:px-6">
				<nav
					className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-[0.18em]"
					aria-label={t("shop_footer_nav_aria")}
				>
					<Link
						href="/shop"
						className="transition-colors hover:text-foreground"
					>
						{t("shop_shell_nav_shop")}
					</Link>
					<Link
						href="/about"
						className="transition-colors hover:text-foreground"
					>
						{t("shop_shell_nav_about")}
					</Link>
					<Link href="/faq" className="transition-colors hover:text-foreground">
						{t("shop_shell_nav_faq")}
					</Link>
					<Link
						href="/contact"
						className="transition-colors hover:text-foreground"
					>
						{t("shop_shell_nav_contact")}
					</Link>
					<Link
						href="/privacy"
						className="transition-colors hover:text-foreground"
					>
						{t("shop_shell_nav_privacy")}
					</Link>
					<Link
						href="/terms"
						className="transition-colors hover:text-foreground"
					>
						{t("shop_shell_nav_terms")}
					</Link>
				</nav>
				<p className="mt-6 text-center text-[11px] tracking-wide text-muted-foreground/70">
					{t("shop_footer_copyright", { year })}
				</p>
			</div>
		</footer>
	);
}

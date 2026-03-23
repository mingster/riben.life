"use client";
import { IconArrowUp } from "@tabler/icons-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useI18n } from "@/providers/i18n-provider";

export function Footer({ className, ...props }: { className?: string }) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<footer className="xs:bottom-10 bottom-32 w-full justify-center text-center py-4 sm:py-6">
			<div className="flex justify-between flex-row content-end items-end py-2 sm:py-1">
				<div className="px-2 sm:px-1 lg:px-10 text-xs sm:text-sm uppercase">
					&nbsp;
				</div>

				{/* scroll up to top */}
				<div className="flex justify-center w-full pb-2 sm:pb-4">
					<a
						href="#top"
						title="scroll up to top"
						className="h-12 w-12 flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted active:bg-muted/70 transition-colors sm:h-10 sm:w-10"
					>
						<IconArrowUp className="h-6 w-6 sm:size-[35px]" />
					</a>
				</div>

				<div className="text-xs sm:text-sm uppercase pr-3 sm:pr-5">
					<Link
						href="/privacy"
						className="text-xs text-muted-foreground font-mono shrink-0 mx-2"
					>
						{t("privacy_policy")}
					</Link>
					<Link
						href="/terms"
						className="text-xs text-muted-foreground font-mono shrink-0 mx-2"
					>
						{t("terms_of_service")}
					</Link>
				</div>
			</div>
		</footer>
	);
}

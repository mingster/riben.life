"use client";

import { FileWarning } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { useTranslation } from "@/app/i18n/client";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/i18n-provider";

/**
 * Wraps disabled pro-only controls. Hover shows upgrade message (disabled buttons do not receive pointer events).
 */
export function ProFeatureTooltip({
	children,
	gated,
	className,
}: {
	children: ReactNode;
	gated: boolean;
	className?: string;
}) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	if (!gated) {
		return <>{children}</>;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					className={cn("inline-flex cursor-not-allowed", className)}
					tabIndex={0}
				>
					{children}
				</span>
			</TooltipTrigger>
			<TooltipContent side="bottom" sideOffset={6}>
				{t("required_pro_version")}
			</TooltipContent>
		</Tooltip>
	);
}

export const RequiredProVersion = () => {
	const params = useParams();
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	return (
		<div>
			<Link
				className="flex gap-2 py-2 font-bold"
				href={`/storeAdmin/${params.storeId}/subscribe`}
			>
				<FileWarning className="size-6 text-red-500" />
				{t("required_pro_version")}
			</Link>
		</div>
	);
};

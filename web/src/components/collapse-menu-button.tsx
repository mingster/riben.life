"use client";

import type { Icon } from "@tabler/icons-react";
import { IconChevronDown } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CollapseMenuButtonProps {
	icon: Icon;
	title: string;
	isCollapsed: boolean;
	onClick?: () => void;
}

export function CollapseMenuButton({
	icon: Icon,
	title,
	isCollapsed,
	onClick,
}: CollapseMenuButtonProps) {
	return (
		<Button
			variant="ghost"
			className={cn(
				"flex h-11 w-full items-center gap-2 px-3 sm:h-9 sm:px-2 touch-manipulation",
				isCollapsed && "justify-center",
			)}
			onClick={onClick}
		>
			<Icon className="h-5 w-5 sm:h-4 sm:w-4" />
			{!isCollapsed && (
				<span className="text-sm sm:text-base font-semibold">{title}</span>
			)}
			{!isCollapsed && (
				<IconChevronDown className="ml-auto h-5 w-5 sm:h-4 sm:w-4" />
			)}
		</Button>
	);
}

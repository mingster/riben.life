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
				"flex h-9 w-full items-center gap-2 px-2",
				isCollapsed && "justify-center",
			)}
			onClick={onClick}
		>
			<Icon className="h-4 w-4" />
			{!isCollapsed && <span>{title}</span>}
			{!isCollapsed && <IconChevronDown className="ml-auto h-4 w-4" />}
		</Button>
	);
}

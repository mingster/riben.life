import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

interface SidebarToggleProps {
	isOpen: boolean | undefined;
	setIsOpen?: () => void;
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
	return (
		<div
			className="invisible md:visible absolute right-[-12px] top-[calc(50%_-_1.5rem)] z-20
    bg-primary-foreground dark:bg-primary-foreground"
		>
			<Button
				onClick={() => setIsOpen?.()}
				className="size-8 rounded-md bg-transparent"
				variant="outline"
				size="icon"
			>
				{isOpen ? (
					<IconChevronLeft
						className={cn(
							"h-4 w-4 transition-transform duration-700 ease-in-out ",
							//isOpen === false ? "rotate-180" : "rotate-0",
						)}
					/>
				) : (
					<IconChevronRight
						className={cn(
							"h-4 w-4 transition-transform duration-700 ease-in-out ",
						)}
					/>
				)}
			</Button>
		</div>
	);
}

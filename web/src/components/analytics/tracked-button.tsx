"use client";

import { Button } from "@/components/ui/button";
import { sendGAEvent } from "@next/third-parties/google";

interface TrackedButtonProps {
	children: React.ReactNode;
	onClick?: () => void;
	trackingEvent?: string;
	trackingParameters?: Record<string, any>;
	className?: string;
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";
	size?: "default" | "sm" | "lg" | "icon";
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}

export function TrackedButton({
	children,
	onClick,
	trackingEvent,
	trackingParameters,
	className,
	variant = "default",
	size = "default",
	disabled = false,
	type = "button",
}: TrackedButtonProps) {
	const handleClick = () => {
		// Track the button click (production only)
		if (process.env.NODE_ENV === "production") {
			if (trackingEvent) {
				sendGAEvent({
					event: trackingEvent,
					...trackingParameters,
				});
			} else {
				// Default tracking for button clicks
				sendGAEvent({
					event: "click",
					event_category: "button",
					event_label: typeof children === "string" ? children : "button",
				});
			}
		}

		// Execute the original onClick handler
		if (onClick) {
			onClick();
		}
	};

	return (
		<Button
			onClick={handleClick}
			className={className}
			variant={variant}
			size={size}
			disabled={disabled}
			type={type}
		>
			{children}
		</Button>
	);
}

"use client";

import { ClipLoader } from "react-spinners";

import { cn } from "@/lib/utils";

export interface FormSubmitOverlayProps {
	/** When true, the overlay is shown above siblings inside a `relative` container. */
	readonly visible: boolean;
	/** Shown next to the spinner; also used for `aria-label`. */
	readonly statusText: string;
	readonly className?: string;
}

/**
 * Full-area blocking overlay during async form submit (see `form-handling.mdc`).
 * Parent must be `position: relative` (e.g. `className="relative"`).
 */
export function FormSubmitOverlay({
	visible,
	statusText,
	className,
}: FormSubmitOverlayProps) {
	if (!visible) {
		return null;
	}

	return (
		<div
			className={cn(
				"absolute inset-0 z-100 flex cursor-wait select-none items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]",
				className,
			)}
			aria-label={statusText}
			aria-live="polite"
			role="status"
		>
			<div className="flex flex-col items-center gap-3">
				<ClipLoader size={40} color="#3498db" />
				<span className="text-sm font-medium text-muted-foreground">
					{statusText}
				</span>
			</div>
		</div>
	);
}

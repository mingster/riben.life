"use client";
import { IconArrowUp } from "@tabler/icons-react";
import React from "react";

export function Footer({ className, ...props }: { className?: string }) {
	return (
		<footer className="xs:bottom-10 bottom-32 w-full justify-center text-center py-4 sm:py-6">
			{/* scroll up to top */}
			<div className="flex justify-center w-full pb-2 sm:pb-4">
				<a
					href="#top"
					title="scroll up to top"
					className="h-12 w-12 min-h-[48px] min-w-[48px] flex items-center justify-center rounded-full bg-background border shadow-sm hover:bg-muted active:bg-muted/70 transition-colors touch-manipulation sm:h-10 sm:w-10 sm:min-h-[44px] sm:min-w-[44px]"
				>
					<IconArrowUp className="h-6 w-6 sm:size-[35px]" />
				</a>
			</div>

			<div className="flex justify-between flex-row content-end items-end py-2 sm:py-1">
				<div className="px-2 sm:px-1 lg:px-10 text-xs sm:text-sm uppercase">
					&nbsp;
				</div>
				<div className="text-xs sm:text-sm uppercase pr-3 sm:pr-5">&nbsp;</div>
			</div>
		</footer>
	);
}

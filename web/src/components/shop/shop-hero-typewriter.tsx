"use client";

import Typewriter from "typewriter-effect";
import { cn } from "@/lib/utils";

interface ShopHeroTypewriterProps {
	text: string;
	className?: string;
}

/**
 * Hero headline with typewriter reveal. Full string is exposed to assistive tech via `aria-label`.
 */
export function ShopHeroTypewriter({
	text,
	className,
}: ShopHeroTypewriterProps) {
	return (
		<h1 className={cn(className)} aria-label={text}>
			<span aria-hidden className="inline">
				<Typewriter
					key={text}
					component="span"
					options={{
						strings: text,
						autoStart: true,
						loop: true,
						delay: 336,
						cursor: "▍",
						skipAddStyles: true,
						wrapperClassName: "inline",
						cursorClassName:
							"ml-0.5 inline-block align-baseline text-muted-foreground animate-pulse font-sans text-[0.85em] font-light",
					}}
				/>
			</span>
		</h1>
	);
}

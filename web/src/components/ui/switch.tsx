"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitives.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
	<SwitchPrimitives.Root
		className={cn(
			"peer inline-flex h-7 w-12 min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation active:opacity-70 data-[state=checked]:bg-neutral-900 data-[state=unchecked]:bg-neutral-200 dark:focus-visible:ring-neutral-300 dark:focus-visible:ring-offset-neutral-950 dark:data-[state=checked]:bg-neutral-50 dark:data-[state=unchecked]:bg-neutral-800 sm:h-6 sm:w-11 sm:min-h-0 sm:min-w-0",
			className,
		)}
		{...props}
		ref={ref}
	>
		<SwitchPrimitives.Thumb
			className={cn(
				"pointer-events-none block h-6 w-6 rounded-full bg-white shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 dark:bg-neutral-950 sm:h-5 sm:w-5",
			)}
		/>
	</SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };

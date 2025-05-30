import clsx from "clsx";
import { Component } from "react";

export function Heading({
	level,
	id,
	children,
	className = "",
	hidden = false,
	ignore = false,
	style = {},
	nextElement,
	...props
}: {
	level: number;
	id: string;
	children?: React.ReactNode;
	className?: string;
	hidden?: boolean;
	ignore?: boolean;
	style?: React.CSSProperties;
	nextElement?: { type: string; depth: number };
}) {
	return (
		<Component
			className={clsx("flex whitespace-pre-wrap not-prose", className, {
				"mb-2 text-sm leading-6 text-sky-500 font-semibold tracking-normal dark:text-sky-400":
					level === 2 &&
					nextElement?.type === "heading" &&
					nextElement?.depth === 3,
			})}
			id={id}
			style={{ ...(hidden ? { marginBottom: 0 } : {}), ...style }}
			data-docsearch-ignore={ignore ? "" : undefined}
			{...props}
		>
			<a
				className={clsx(
					"group relative border-none",
					hidden ? "sr-only" : "lg:-ml-2 lg:pl-2",
				)}
				href={`#${id}`}
			>
				<span className="absolute -ml-8 hidden items-center border-0 opacity-0 group-hover:opacity-100 group-focus:opacity-100 lg:flex">
					&#8203;
					<span
						className={clsx(
							"flex size-6 items-center justify-center rounded-md text-slate-400 shadow-sm ring-1 ring-slate-900/5 hover:text-slate-700 hover:shadow hover:ring-slate-900/10",
							"dark:bg-slate-800 dark:text-slate-400 dark:shadow-none dark:ring-0 dark:hover:bg-slate-700 dark:hover:text-slate-200",
						)}
					>
						<svg width="12" height="12" fill="none" aria-hidden="true">
							<path
								d="M3.75 1v10M8.25 1v10M1 3.75h10M1 8.25h10"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
					</span>
				</span>
				{children}
			</a>
		</Component>
	);
}

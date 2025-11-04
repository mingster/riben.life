import clsx from "clsx";

interface HeadingProps {
	title: string;
	badge?: number;
	description?: string;
	className?: string;
}

export const Heading: React.FC<HeadingProps> = ({
	title,
	badge,
	description,
	className,
}) => {
	if (!badge) badge = 0;

	return (
		<div className={clsx("", className)}>
			<strong className="relative inline-flex items-center rounded">
				{badge !== null && badge !== undefined && badge !== 0 && (
					<span className="absolute -top-1 -right-4 size-5 rounded-full bg-green-800 text-slate-100 flex justify-center items-center text-xs pb-1">
						<span>{badge}</span>
					</span>
				)}
				<h1 className="text-xl uppercase tracking-tight text-slate-900 dark:text-gray-200">
					{title}
				</h1>
			</strong>
			{description && (
				<div
					className="text-muted-foreground text-xs p-0"
					suppressHydrationWarning
				>
					{description}
				</div>
			)}
		</div>
	);
};

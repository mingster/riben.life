import clsx from "clsx";

export function Logo({ className, ...props }: { className?: string }) {
	return (
		<div className="flex items-center gap-1">
			<svg
				aria-hidden="true"
				className={clsx("flex text-slate-900 dark:text-white", className)}
				width={32}
				height={32}
				viewBox="0 0 128 128"
				{...props}
			>
				<defs>
					<linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
						<stop
							offset="0%"
							style={{ stopColor: "#3b82f6", stopOpacity: 1 }}
						/>
						<stop
							offset="100%"
							style={{ stopColor: "#1e40af", stopOpacity: 1 }}
						/>
					</linearGradient>
				</defs>
				<circle cx="64" cy="64" r="60" fill="url(#logoGradient)" />
				<text
					x="64"
					y="64"
					fontFamily="Arial, 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif"
					fontSize="72"
					fontWeight="bold"
					fill="white"
					textAnchor="middle"
					dominantBaseline="central"
					style={{
						textRendering: "optimizeLegibility",
						WebkitFontSmoothing: "antialiased",
					}}
				>
					利
				</text>
			</svg>
		</div>
	);
}

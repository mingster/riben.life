import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

export default function RootMarketingLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div className="flex min-h-dvh flex-col">
			<div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
			<SiteFooter className="relative z-10 mt-auto shrink-0" />
		</div>
	);
}

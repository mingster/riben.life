import { GlobalNavbar } from "@/components/global-navbar";
import React from "react";

export default async function Layout({ children }: React.PropsWithChildren) {
	return (
		<div className="max-w-screen overflow-x-hidden">
			<GlobalNavbar title={"QR Code Generator"} />
			{/* Main content area */}
			<div className="text-gray-950 dark:text-white">{children}</div>
		</div>
	);
}

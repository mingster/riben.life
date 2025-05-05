import { Navbar } from "@/components/global-navbar";
import Container from "@/components/ui/container";
import { Toaster } from "@/components/ui/toaster";

import { Loader } from "@/components/ui/loader";
import { Suspense } from "react";
export default async function StoreHomeLayout({
	children, // will be a page or nested layout
}: {
	children: React.ReactNode;
}) {
	return (
		<Suspense fallback={<Loader />}>
			<Navbar title="" />
			<Container>{children}</Container>
			<Toaster />
		</Suspense>
	);
}

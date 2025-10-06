import { GlobalNavbar } from "@/components/global-navbar";
import Container from "@/components/ui/container";

import { Loader } from "@/components/loader";
import { Suspense } from "react";
export default async function StoreHomeLayout({
	children, // will be a page or nested layout
}: {
	children: React.ReactNode;
}) {
	return (
		<Suspense fallback={<Loader />}>
			<GlobalNavbar title="" />
			<Container>{children}</Container>
		</Suspense>
	);
}

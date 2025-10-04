"use server";

import { Suspense } from "react";
import { Loader } from "@/components/loader";

export default async function RootLayout(props: { children: React.ReactNode }) {
	const {
		// will be a page or nested layout
		children,
	} = props;

	return (
		<Suspense fallback={<Loader />}>
			<main>
				{children}
			</main>
		</Suspense>
	);
}

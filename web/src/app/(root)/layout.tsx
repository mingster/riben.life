"use server";

import { Suspense } from "react";
import { Loader } from "@/components/loader";
import { SystemMessageDisplay } from "@/components/show_system_message";

export default async function RootLayout(props: { children: React.ReactNode }) {
	const {
		// will be a page or nested layout
		children,
	} = props;

	return (
		<Suspense fallback={<Loader />}>
			<main>
				<SystemMessageDisplay />
				{children}
			</main>
		</Suspense>
	);
}

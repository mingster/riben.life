import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { UniversalHomeContent } from "./components/universal-home-content";
import { requireAuth } from "@/lib/auth-utils";

export default async function GlobalHome() {
	const session = await requireAuth();

	return (
		<>
			<Suspense fallback={<Loader />}>
				<UniversalHomeContent />
			</Suspense>
		</>
	);
}

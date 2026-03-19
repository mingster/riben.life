import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { WaitlistMarketingContent } from "./components/waitlist-marketing-content";

export default async function WaitlistMarketingPage() {
	return (
		<Suspense fallback={<Loader />}>
			<WaitlistMarketingContent />
		</Suspense>
	);
}

import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { RsvpMarketingContent } from "./components/rsvp-marketing-content";

export default async function RsvpMarketingPage() {
	return (
		<Suspense fallback={<Loader />}>
			<RsvpMarketingContent />
		</Suspense>
	);
}

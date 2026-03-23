import { Loader } from "@/components/loader";
import { Suspense } from "react";
import { parseMarketingSystemId } from "./components/marketing-system-types";
import { UniversalHomeContent } from "./components/universal-home-content";

/** Deep-link: `/unv?system=order|rsvp|waitlist` (default: order). */
export default async function GlobalHome(props: {
	searchParams: Promise<{ system?: string | string[] }>;
}) {
	const searchParams = await props.searchParams;
	const raw = searchParams?.system;
	const systemParam = Array.isArray(raw) ? raw[0] : raw;
	const initialSystem = parseMarketingSystemId(systemParam);

	return (
		<Suspense fallback={<Loader />}>
			<UniversalHomeContent initialSystem={initialSystem} />
		</Suspense>
	);
}

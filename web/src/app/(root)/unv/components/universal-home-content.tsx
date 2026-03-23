"use client";

import ScrollSpy from "react-ui-scrollspy";

import { AboutUs } from "./AboutUs";
import { ContactFormComponent } from "./ContactForm";
import { Cost } from "./Cost";
import { Footer } from "./Footer";
import { NavBar } from "./Header";
import { MarketingInPageNav } from "./marketing-in-page-nav";
import {
	MarketingSystemProvider,
	useMarketingSystem,
} from "./marketing-system-context";
import type { MarketingSystemId } from "./marketing-system-types";
import { OrderMarketingBody } from "./order-marketing-content";
import { RsvpMarketingBody } from "./rsvp-marketing-body";
import { UnifiedMarketingHero } from "./unified-marketing-hero";
import { WaitlistMarketingBody } from "./waitlist-marketing-body";

function MarketingBodySwitcher() {
	const { activeSystem } = useMarketingSystem();

	if (activeSystem === "order") {
		return <OrderMarketingBody />;
	}
	if (activeSystem === "rsvp") {
		return <RsvpMarketingBody />;
	}
	return <WaitlistMarketingBody />;
}

interface UniversalHomeContentProps {
	initialSystem: MarketingSystemId;
}

export function UniversalHomeContent({
	initialSystem,
}: UniversalHomeContentProps) {
	return (
		<MarketingSystemProvider initialSystem={initialSystem}>
			<NavBar />

			{/* Single column so in-page nav `position:sticky` stays valid through hero + body */}
			<div className="relative">
				<UnifiedMarketingHero />
				{/* Half of each pill overlaps the hero video; then sticks under the main navbar */}
				<MarketingInPageNav className="-mt-5 sm:-mt-[18px]" />

				<div className="mb-16 flex flex-col gap-y-0 overflow-x-hidden bg-background pt-8 font-minimal text-foreground sm:mb-32 sm:pt-2 md:mb-40">
					<ScrollSpy scrollThrottle={100} useBoxMethod={false}>
						<MarketingBodySwitcher />
						<Cost />
						<AboutUs />
						<ContactFormComponent />
					</ScrollSpy>
				</div>
			</div>
			<Footer />
		</MarketingSystemProvider>
	);
}

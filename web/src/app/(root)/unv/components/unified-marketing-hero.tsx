"use client";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import Link from "next/link";
import TypewriterComponent from "typewriter-effect";

import { useMarketingSystem } from "./marketing-system-context";
import type { MarketingSystemId } from "./marketing-system-types";

const VIDEO_SRC: Record<MarketingSystemId, string> = {
	order: "/videos/order.mp4",
	rsvp: "/videos/rsvp.mp4",
	waitlist: "/videos/waiting_line.mp4",
};

const SYSTEM_IDS: MarketingSystemId[] = ["order", "rsvp", "waitlist"];

const NAV_LABEL_KEY: Record<MarketingSystemId, string> = {
	order: "nav_order",
	rsvp: "nav_rsvp",
	waitlist: "nav_waitlist",
};

export function UnifiedMarketingHero() {
	const { lng } = useI18n();
	const { t } = useTranslation(lng, "marketing");
	const { activeSystem, setActiveSystem } = useMarketingSystem();

	return (
		<section className="relative isolate min-h-[420px] overflow-hidden sm:min-h-[480px] md:min-h-[520px]">
			<span className="hash-span absolute top-0" id="top">
				&nbsp;
			</span>
			<video
				key={activeSystem}
				aria-hidden
				className="absolute inset-0 h-full w-full object-cover"
				autoPlay
				muted
				loop
				playsInline
				preload="metadata"
			>
				<source src={VIDEO_SRC[activeSystem]} type="video/mp4" />
			</video>
			<div
				aria-hidden
				className="absolute inset-0 bg-slate-900/55 dark:bg-slate-950/70"
			/>
			<div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-3 pt-16 pb-8 text-center sm:px-4 sm:pt-20 sm:pb-10 lg:pt-24 xl:pt-28 xl:pb-12 md:px-6 lg:px-8">
				{activeSystem === "order" && (
					<>
						<h1 className="w-full text-2xl font-extrabold tracking-tight text-white px-2 drop-shadow-sm sm:text-3xl lg:text-4xl xl:text-5xl">
							<TypewriterComponent
								options={{
									strings: [
										t("order_marketing_hero_typewriter_1"),
										t("order_marketing_hero_typewriter_2"),
									],
									autoStart: true,
									loop: true,
								}}
							/>
						</h1>
						<p className="max-w-3xl mx-auto mt-4 sm:mt-6 text-base sm:text-lg text-slate-100 px-3 sm:px-0">
							{t("order_marketing_hero_tagline")}
						</p>
						<div className="flex justify-center mt-6 space-x-6 text-sm sm:mt-10 px-3 sm:px-0">
							<Link
								href="/storeAdmin/"
								className="flex items-center justify-center w-full h-12 min-h-11 px-6 font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 active:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400 dark:active:bg-sky-600 touch-manipulation"
							>
								{t("order_marketing_hero_cta")}
							</Link>
						</div>
					</>
				)}

				{activeSystem === "rsvp" && (
					<>
						<h1 className="w-full text-2xl font-extrabold tracking-tight text-white drop-shadow-sm sm:text-3xl lg:text-4xl xl:text-5xl">
							{t("rsvp_marketing_hero_title")}
						</h1>
						<p className="mt-4 max-w-3xl text-base text-slate-100 sm:mt-6 sm:text-lg">
							{t("rsvp_marketing_hero_tagline")}
						</p>
						<div className="mt-8 flex w-full max-w-xl flex-wrap items-center justify-center gap-3 sm:mt-10">
							<Link
								href="/storeAdmin/"
								className="inline-flex h-12 min-h-11 flex-1 items-center justify-center rounded-full bg-slate-900 px-6 text-base font-semibold text-white shadow-md hover:bg-slate-700 active:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 sm:flex-none dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400 dark:active:bg-sky-600 touch-manipulation"
							>
								{t("rsvp_marketing_hero_cta")}
							</Link>
							<button
								type="button"
								onClick={() => setActiveSystem("waitlist")}
								className="inline-flex h-12 min-h-11 flex-1 items-center justify-center rounded-full border border-white/40 bg-white/10 px-6 text-base font-medium text-white shadow-sm backdrop-blur-sm hover:bg-white/20 touch-manipulation sm:flex-none"
							>
								{t("rsvp_marketing_link_waitlist")}
							</button>
						</div>
					</>
				)}

				{activeSystem === "waitlist" && (
					<>
						<h1 className="w-full text-2xl font-extrabold tracking-tight text-center text-white px-2 sm:text-3xl lg:text-4xl xl:text-5xl drop-shadow-sm">
							<TypewriterComponent
								options={{
									strings: [
										t("waitlist_marketing_hero_typewriter_1"),
										t("waitlist_marketing_hero_typewriter_2"),
									],
									autoStart: true,
									loop: true,
								}}
							/>
						</h1>
						<p className="max-w-3xl mx-auto mt-4 sm:mt-6 text-base sm:text-lg text-center text-slate-100 px-3 sm:px-0">
							{t("waitlist_marketing_hero_tagline")}
						</p>
						<div className="flex justify-center mt-6 space-x-6 text-sm sm:mt-10 px-3 sm:px-0">
							<Link
								href="/storeAdmin/"
								className="flex items-center justify-center w-full h-12 min-h-11 px-6 font-semibold text-white rounded-lg bg-slate-900 hover:bg-slate-700 active:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 sm:w-auto dark:bg-sky-500 dark:highlight-white/20 dark:hover:bg-sky-400 dark:active:bg-sky-600 touch-manipulation"
							>
								{t("waitlist_marketing_hero_cta")}
							</Link>
						</div>
					</>
				)}
			</div>
		</section>
	);
}

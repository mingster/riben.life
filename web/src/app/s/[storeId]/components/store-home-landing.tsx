"use client";

import type { StoreFacility, StoreSettings } from "@prisma/client";
import {
	IconCalendar,
	IconHelp,
	IconShoppingCart,
	IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/app/i18n/client";
import { LineAddFriendPrompt } from "@/components/line-add-friend-prompt";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import type { RsvpSettings, StoreWithProducts } from "@/types";

interface StoreHomeLandingProps {
	store: StoreWithProducts;
	rsvpSettings: RsvpSettings;
	storeSettings: StoreSettings;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	waitlistEnabled: boolean;
	facilities: StoreFacility[];
}

export function StoreHomeLanding({
	store,
	rsvpSettings,
	storeSettings,
	useOrderSystem,
	acceptReservation,
	waitlistEnabled,
	facilities,
}: StoreHomeLandingProps) {
	const { t } = useTranslation("translation");
	const router = useRouter();

	const handleNavigate = (path: string) => {
		router.push(path);
	};

	return (
		<div className="relative w-full overflow-hidden">
			{/* full-screen background video + soft overlay */}
			<div className="relative min-h-screen flex flex-col">
				<video
					autoPlay
					loop
					muted
					playsInline
					className="fixed inset-0 w-screen h-screen min-w-full min-h-full object-cover z-0"
					aria-hidden
				>
					<source src="/videos/store-home-background.mp4" type="video/mp4" />
				</video>
				<div className="absolute inset-0 bg-black/25 z-10" />

				<Container className="relative z-20 flex flex-col items-center justify-center min-h-screen gap-5 py-12">
					<div className="text-center max-w-2xl">
						<h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white mb-2">
							{store.name}
						</h1>
						{storeSettings.description && (
							<p className="text-base sm:text-lg text-white/90 leading-relaxed">
								{storeSettings.description}
							</p>
						)}
					</div>

					{/* Single prominent CTA */}
					<div className="flex flex-wrap gap-3 justify-center">
						{useOrderSystem && (
							<Button
								size="lg"
								onClick={() => handleNavigate(`/s/${store.id}/menu`)}
								className="min-w-[200px] h-12 rounded-full shadow-md"
							>
								<IconShoppingCart className="mr-2 h-5 w-5" />
								{t("online_order")}
							</Button>
						)}
						{acceptReservation && (
							<Button
								size="lg"
								onClick={() => handleNavigate(`/s/${store.id}/reservation`)}
								className="min-w-[200px] h-12 rounded-full shadow-md"
							>
								<IconCalendar className="mr-2 h-5 w-5" />
								{t("reservation")}
							</Button>
						)}
						{waitlistEnabled && (
							<Button
								size="lg"
								onClick={() => handleNavigate(`/s/${store.id}/waitlist`)}
								className="min-w-[200px] h-12 rounded-full shadow-md"
							>
								<IconUserPlus className="mr-2 h-5 w-5" />
								{t("waitlist_join_button")}
							</Button>
						)}
					</div>

					{/* Section: Reserve a space / facilities */}
					{acceptReservation && facilities.length > 0 && (
						<Container className="py-10 sm:py-14">
							<div className="mb-6 sm:mb-8">
								<h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
									{t("reservation")}
								</h2>
								<p className="text-sm text-muted-foreground max-w-xl">
									{t("reserve_a_space_description") ||
										"Choose a facility to book."}
								</p>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
								{facilities.map((facility) => (
									<Link
										key={facility.id}
										href={`/s/${store.id}/reservation/${facility.id}`}
										className="block group"
									>
										<Card className="h-full bg-card/10 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-border group-hover:scale-[1.02]">
											<CardHeader className="space-y-2">
												<CardTitle className="flex items-center text-base font-medium">
													<IconCalendar className="mr-2 h-5 w-5 text-primary" />
													{facility.facilityName}
												</CardTitle>
												{facility.description && (
													<CardDescription className="line-clamp-2 text-muted-foreground">
														{facility.description}
													</CardDescription>
												)}
											</CardHeader>
										</Card>
									</Link>
								))}
							</div>
						</Container>
					)}

					{/* Secondary actions + FAQ */}
					<Container className="pb-10">
						<div className="flex flex-wrap gap-3 justify-center">
							<Button
								size="lg"
								variant="outline"
								onClick={() => handleNavigate(`/s/${store.id}/faq`)}
								className="min-w-[160px] h-11 rounded-full"
							>
								<IconHelp className="mr-2 h-4 w-4" />
								{t("f_a_q")}
							</Button>
						</div>

						<div className="w-full mt-8">
							<LineAddFriendPrompt
								hasLineAccount={true}
								hasAddedOfficialAccount={false}
								variant="banner"
							/>
						</div>
					</Container>
				</Container>
			</div>
		</div>
	);
}

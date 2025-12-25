"use client";

import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import { useRouter } from "next/navigation";
import { IconShoppingCart, IconCalendar, IconHelp } from "@tabler/icons-react";
import { useTranslation } from "@/app/i18n/client";
import type { Store, RsvpSettings } from "@/types";
import type { StoreSettings } from "@prisma/client";

interface FacilityLandingProps {
	store: Store;
	facility: { id: string; facilityName: string } | null;
	rsvpSettings: RsvpSettings | null;
	storeSettings: StoreSettings;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	isStoreOpen: boolean;
	closed_descr?: string;
}

export function FacilityLanding({
	store,
	facility,
	rsvpSettings,
	storeSettings,
	useOrderSystem,
	acceptReservation,
	isStoreOpen,
	closed_descr,
}: FacilityLandingProps) {
	const router = useRouter();
	const { t } = useTranslation("translation");

	const handleNavigate = (path: string) => {
		router.push(path);
	};

	return (
		<div className="relative w-full min-h-[60vh] overflow-hidden">
			{/* Background Video */}
			<video
				autoPlay
				loop
				muted
				playsInline
				className="absolute inset-0 w-full h-full object-cover z-0"
			>
				<source src="/videos/store-home-background.mp4" type="video/mp4" />
			</video>

			{/* Overlay for better text readability */}
			<div className="absolute inset-0 bg-black/40 z-10" />

			{/* Content */}
			<Container className="relative z-20">
				<div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 py-12">
					<div className="text-center">
						<h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-2">
							{store.name}
						</h1>
						{facility && (
							<h2 className="text-2xl lg:text-3xl font-bold text-white/90 mb-4">
								{facility.facilityName}
							</h2>
						)}
						{!isStoreOpen ? (
							<>
								<p className="text-lg text-white/90 mb-2">
									{t("store_closed")}
								</p>
								{closed_descr && (
									<div className="text-base text-white/80 mb-4">
										{t("store_next_opening_hours")}: {closed_descr}
									</div>
								)}
							</>
						) : (
							storeSettings.description && (
								<p className="text-lg text-white/90">
									{storeSettings.description}
								</p>
							)
						)}
					</div>

					<div className="flex flex-wrap gap-4 justify-center mt-8">
						{isStoreOpen && useOrderSystem && facility && (
							<Button
								size="lg"
								onClick={() =>
									handleNavigate(`/s/${store.id}/menu?facility=${facility.id}`)
								}
								className="min-w-[200px] h-12"
							>
								<IconShoppingCart className="mr-2 h-5 w-5" />
								{t("online_order")}
							</Button>
						)}

						{acceptReservation && facility && (
							<Button
								size="lg"
								variant={isStoreOpen && useOrderSystem ? "outline" : "default"}
								onClick={() =>
									handleNavigate(
										`/s/${store.id}/reservation?facility=${facility.id}`,
									)
								}
								className="min-w-[200px] h-12"
							>
								<IconCalendar className="mr-2 h-5 w-5" />
								{t("reservation")}
							</Button>
						)}

						<Button
							size="lg"
							variant="outline"
							onClick={() => handleNavigate(`/s/${store.id}/faq`)}
							className="min-w-[200px] h-12"
						>
							<IconHelp className="mr-2 h-5 w-5" />
							{t("FAQ")}
						</Button>
					</div>
				</div>
			</Container>
		</div>
	);
}

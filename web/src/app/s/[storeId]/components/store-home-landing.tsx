"use client";

import { Button } from "@/components/ui/button";
import Container from "@/components/ui/container";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { IconShoppingCart, IconCalendar, IconHelp } from "@tabler/icons-react";
import type { Store, RsvpSettings } from "@/types";
import type { StoreSettings, StoreFacility } from "@prisma/client";
import { useTranslation } from "@/app/i18n/client";
import Link from "next/link";

interface StoreHomeLandingProps {
	store: Store;
	rsvpSettings: RsvpSettings;
	storeSettings: StoreSettings;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	facilities: StoreFacility[];
}

export function StoreHomeLanding({
	store,
	rsvpSettings,
	storeSettings,
	useOrderSystem,
	acceptReservation,
	facilities,
}: StoreHomeLandingProps) {
	const { t } = useTranslation("translation");
	const router = useRouter();

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
						{storeSettings.description && (
							<p className="text-lg text-white/90">
								{storeSettings.description}
							</p>
						)}
					</div>

					{/* reserve a facilities */}
					{acceptReservation && facilities.length > 0 && (
						<div className="w-full mt-1 gap-4 justify-center p-10">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
								{facilities.map((facility) => (
									<Link
										key={facility.id}
										href={`/s/${store.id}/reservation/${facility.id}`}
										className="block"
									>
										<Card
											className="h-full hover:shadow-lg transition-shadow cursor-pointer
										 bg-white/65 dark:bg-neutral-900/65 backdrop-blur-sm"
										>
											<CardHeader>
												<CardTitle className="flex">
													<IconCalendar className="mr-2 h-5 w-5" />
													{facility.facilityName}
												</CardTitle>
												{facility.description && (
													<CardDescription className="line-clamp-2">
														{facility.description}
													</CardDescription>
												)}
											</CardHeader>
										</Card>
									</Link>
								))}
							</div>
						</div>
					)}

					<div className="flex flex-wrap gap-4 justify-center">
						{useOrderSystem && (
							<Button
								size="lg"
								variant={useOrderSystem ? "outline" : "default"}
								onClick={() => handleNavigate(`/s/${store.id}/menu`)}
								className="min-w-[200px] h-12"
							>
								<IconShoppingCart className="mr-2 h-5 w-5" />
								{t("online_order")}
							</Button>
						)}

						{acceptReservation && (
							<Button
								size="lg"
								onClick={() => handleNavigate(`/s/${store.id}/reservation`)}
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
							{t("f_a_q")}
						</Button>
					</div>
				</div>
			</Container>
		</div>
	);
}

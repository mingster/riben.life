"use client";

import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { IconCalendar } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { useTranslation } from "@/app/i18n/client";
import { RsvpSettings, Store } from "@/types";
import type { StoreFacility, StoreSettings } from "@prisma/client";
import Link from "next/link";

interface ClientReservationProps {
	store: Store;
	rsvpSettings: RsvpSettings;
	storeSettings: StoreSettings;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	facilities: StoreFacility[];
}

export function ClientReservation({
	store,
	rsvpSettings,
	storeSettings,
	useOrderSystem,
	acceptReservation,
	facilities,
}: ClientReservationProps) {
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
				<div className="flex flex-col items-center justify-center min-h-[30vh] gap-6 py-12">
					<div className="text-center">
						<h1 className="text-4xl lg:text-2xl font-extrabold tracking-tight mb-2">
							{t("rsvp_reserve_facilities")}
						</h1>
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
				</div>
			</Container>
		</div>
	);
}

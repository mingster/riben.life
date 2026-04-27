"use client";

import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import { useTranslation } from "@/app/i18n/client";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { useResolvedCustomerStoreBasePath } from "@/providers/customer-store-base-path";
import type { RsvpSettings, StoreWithProducts } from "@/types";
import { RsvpMode } from "@/types/enum";
import { IconCalendar, IconUser } from "@tabler/icons-react";
import type { StoreFacility, StoreSettings } from "@prisma/client";
import Link from "next/link";

interface ClientReservationProps {
	store: StoreWithProducts;
	rsvpSettings: RsvpSettings;
	storeSettings: StoreSettings;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	facilities: StoreFacility[];
	/** Populated when `rsvpMode` is personnel (service-staff booking). */
	serviceStaff?: ServiceStaffColumn[];
}

export function ClientReservation({
	store,
	rsvpSettings,
	storeSettings: _storeSettings,
	useOrderSystem: _useOrderSystem,
	acceptReservation,
	facilities,
	serviceStaff = [],
}: ClientReservationProps) {
	const { t } = useTranslation("translation");
	const customerBase = useResolvedCustomerStoreBasePath(store.id);

	const rsvpMode = Number(rsvpSettings?.rsvpMode ?? RsvpMode.FACILITY);
	const hubTitle =
		rsvpMode === RsvpMode.PERSONNEL
			? t("rsvp_reserve_personnel")
			: t("rsvp_reserve_facilities");

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
					{acceptReservation && (
						<div className="text-center">
							<h1 className="text-4xl lg:text-2xl font-extrabold tracking-tight mb-2">
								{hubTitle}
							</h1>
						</div>
					)}

					{!acceptReservation && (
						<Card className="w-full max-w-xl bg-white/75 text-center shadow-lg backdrop-blur-sm dark:bg-neutral-900/75">
							<CardHeader>
								<CardTitle>{t("rsvp_not_currently_accepted")}</CardTitle>
								<CardDescription>
									{t("rsvp_not_currently_accepted_descr")}
								</CardDescription>
							</CardHeader>
						</Card>
					)}

					{acceptReservation && rsvpMode === RsvpMode.PERSONNEL && (
						<div className="w-full mt-1 gap-4 justify-center p-10">
							{serviceStaff.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
									{serviceStaff.map((staff) => (
										<Link
											key={staff.id}
											href={`${customerBase}/reservation/service-staff/${staff.id}`}
											className="block"
										>
											<Card
												className="h-full hover:shadow-lg transition-shadow cursor-pointer
										 bg-white/65 dark:bg-neutral-900/65 backdrop-blur-sm"
											>
												<CardHeader>
													<CardTitle className="flex">
														<IconUser className="mr-2 h-5 w-5 shrink-0" />
														<span className="line-clamp-2">
															{staff.userName ||
																staff.userEmail ||
																t("service_staff")}
														</span>
													</CardTitle>
													{staff.description && (
														<CardDescription className="line-clamp-2">
															{staff.description}
														</CardDescription>
													)}
												</CardHeader>
											</Card>
										</Link>
									))}
								</div>
							) : (
								<p className="max-w-md text-center text-sm text-white/90">
									{t("rsvp_no_staff_available")}
								</p>
							)}
						</div>
					)}

					{/* Facility list (facility mode) */}
					{acceptReservation &&
						rsvpMode === RsvpMode.FACILITY &&
						facilities.length > 0 && (
							<div className="w-full mt-1 gap-4 justify-center p-10">
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
									{facilities.map((facility) => (
										<Link
											key={facility.id}
											href={`${customerBase}/reservation/${facility.id}`}
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

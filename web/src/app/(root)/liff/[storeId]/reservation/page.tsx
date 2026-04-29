import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { RsvpMode } from "@/types/enum";
import { IconCalendar, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCachedLiffStoreHomeData } from "../get-cached-liff-store-home-data";

type Params = Promise<{ storeId: string }>;

export default async function LiffReservationListPage(props: {
	params: Params;
}) {
	const { storeId } = await props.params;

	const data = await getCachedLiffStoreHomeData(storeId);
	if (!data) redirect("/unv");

	const { rsvpSettings, facilities, serviceStaff } = data;
	const rsvpMode = Number(rsvpSettings.rsvpMode ?? RsvpMode.FACILITY);

	if (!rsvpSettings.acceptReservation) redirect(`/liff/${storeId}`);

	// RESTAURANT: no picker needed, go straight to open booking
	if (rsvpMode === RsvpMode.RESTAURANT) {
		redirect(`/liff/${storeId}/reservation/open`);
	}

	// FACILITY: redirect if only one facility
	if (rsvpMode === RsvpMode.FACILITY) {
		if (facilities.length === 0) redirect(`/liff/${storeId}`);
		if (facilities.length === 1) {
			redirect(`/liff/${storeId}/reservation/${facilities[0].id}`);
		}
	}

	// PERSONNEL: redirect if only one staff member
	const staff: ServiceStaffColumn[] = serviceStaff ?? [];
	if (rsvpMode === RsvpMode.PERSONNEL) {
		if (staff.length === 0) redirect(`/liff/${storeId}`);
		if (staff.length === 1) {
			redirect(`/liff/${storeId}/reservation/service-staff/${staff[0].id}`);
		}
	}

	return (
		<div className="mx-auto max-w-lg px-3 py-6 sm:px-4">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{rsvpMode === RsvpMode.FACILITY &&
					facilities.map((facility) => (
						<Link
							key={facility.id}
							href={`/liff/${storeId}/reservation/${facility.id}`}
							className="group block touch-manipulation"
						>
							<Card className="h-full border-border transition-shadow group-hover:shadow-md">
								<CardHeader className="p-4">
									<CardTitle className="flex items-center gap-2 text-base font-medium">
										<IconCalendar className="h-5 w-5 shrink-0 text-primary" />
										{facility.facilityName}
									</CardTitle>
									{facility.description ? (
										<CardDescription className="text-sm">
											{facility.description}
										</CardDescription>
									) : null}
								</CardHeader>
							</Card>
						</Link>
					))}

				{rsvpMode === RsvpMode.PERSONNEL &&
					staff.map((s) => (
						<Link
							key={s.id}
							href={`/liff/${storeId}/reservation/service-staff/${s.id}`}
							className="group block touch-manipulation"
						>
							<Card className="h-full border-border transition-shadow group-hover:shadow-md">
								<CardHeader className="p-4">
									<CardTitle className="flex items-center gap-2 text-base font-medium">
										<IconUser className="h-5 w-5 shrink-0 text-primary" />
										{s.userName || s.userEmail}
									</CardTitle>
									{s.description ? (
										<CardDescription className="text-sm">
											{s.description}
										</CardDescription>
									) : null}
								</CardHeader>
							</Card>
						</Link>
					))}
			</div>
		</div>
	);
}

"use client";

import type { ServiceStaffColumn } from "@/app/storeAdmin/(dashboard)/[storeId]/(routes)/service-staff/service-staff-column";
import type { StoreFacility, StoreSettings } from "@prisma/client";
import {
	IconCalendar,
	IconHelp,
	IconShoppingCart,
	IconUser,
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
import { useResolvedCustomerStoreBasePath } from "@/providers/customer-store-base-path";
import { useI18n } from "@/providers/i18n-provider";
import { useLiff } from "@/providers/liff-provider";
import type { RsvpSettings, StoreWithProducts } from "@/types";
import { RsvpMode } from "@/types/enum";

export interface LiffStoreHomeProps {
	store: StoreWithProducts;
	rsvpSettings: RsvpSettings;
	storeSettings: StoreSettings;
	waitListSettings: { enabled?: boolean | null } | null;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	facilities: StoreFacility[];
	serviceStaff?: ServiceStaffColumn[];
}

/**
 * LINE-friendly store home; paths use {@link useResolvedCustomerStoreBasePath} (`/liff/…` or `/s/…`).
 */
export function LiffStoreHome({
	store,
	rsvpSettings,
	storeSettings,
	waitListSettings,
	useOrderSystem,
	acceptReservation,
	facilities,
	serviceStaff = [],
}: LiffStoreHomeProps) {
	const rsvpMode = Number(rsvpSettings?.rsvpMode ?? RsvpMode.FACILITY);
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();
	const { ready, profile } = useLiff();
	const customerBasePath = useResolvedCustomerStoreBasePath(store.id);

	const push = (suffix: string) => {
		router.push(`${customerBasePath}${suffix}`);
	};

	const showGreeting = ready && Boolean(profile?.displayName?.trim());
	const waitlistEnabled = waitListSettings?.enabled === true;

	return (
		<div className="mx-auto flex max-w-lg flex-col gap-6 pb-8 sm:max-w-xl">
			<header className="space-y-2 text-center sm:text-left">
				{showGreeting ? (
					<p className="text-sm text-muted-foreground">
						{t("liff_store_home_greeting", {
							name: profile?.displayName ?? "",
						})}
					</p>
				) : null}
				<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
					{store.name}
				</h1>
				{storeSettings.description ? (
					<p className="text-sm leading-relaxed text-muted-foreground">
						{storeSettings.description}
					</p>
				) : null}
			</header>

			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
				{useOrderSystem ? (
					<Button
						type="button"
						size="lg"
						className="h-11 w-full touch-manipulation sm:h-10 sm:min-h-0 sm:w-auto sm:min-w-44"
						onClick={() => push("/menu")}
					>
						<IconShoppingCart className="mr-2 h-5 w-5" />
						{t("online_order")}
					</Button>
				) : null}
				{acceptReservation ? (
					<Button
						type="button"
						size="lg"
						className="h-11 w-full touch-manipulation sm:h-10 sm:min-h-0 sm:w-auto sm:min-w-44"
						onClick={() => push("/reservation")}
					>
						<IconCalendar className="mr-2 h-5 w-5" />
						{t("reservation")}
					</Button>
				) : null}
				{waitlistEnabled ? (
					<Button
						type="button"
						size="lg"
						className="h-11 w-full touch-manipulation sm:h-10 sm:min-h-0 sm:w-auto sm:min-w-44"
						onClick={() => push("/waitlist")}
					>
						<IconUserPlus className="mr-2 h-5 w-5" />
						{t("waitlist_join_button")}
					</Button>
				) : null}
			</div>

			{acceptReservation ? (
				<section className="space-y-3">
					<div>
						<h2 className="text-base font-semibold sm:text-lg">
							{t("reservation")}
						</h2>
						<p className="text-xs font-mono text-gray-500 sm:text-sm">
							{t("reserve_a_space_description")}
						</p>
					</div>

					{rsvpMode === RsvpMode.FACILITY && facilities.length > 0 && (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{facilities.map((facility) => (
								<Link
									key={facility.id}
									href={`${customerBasePath}/reservation/${facility.id}`}
									className="group block touch-manipulation"
								>
									<Card className="h-full border-border transition-shadow group-hover:shadow-md">
										<CardHeader className="space-y-1.5 p-4">
											<CardTitle className="flex items-center text-base font-medium">
												<IconCalendar className="mr-2 h-5 w-5 shrink-0 text-primary" />
												<span className="line-clamp-2">
													{facility.facilityName}
												</span>
											</CardTitle>
											{facility.description ? (
												<CardDescription className="line-clamp-2">
													{facility.description}
												</CardDescription>
											) : null}
										</CardHeader>
									</Card>
								</Link>
							))}
						</div>
					)}

					{rsvpMode === RsvpMode.PERSONNEL && serviceStaff.length > 0 && (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							{serviceStaff.map((staff) => (
								<Link
									key={staff.id}
									href={`${customerBasePath}/reservation/service-staff/${staff.id}`}
									className="group block touch-manipulation"
								>
									<Card className="h-full border-border transition-shadow group-hover:shadow-md">
										<CardHeader className="space-y-1.5 p-4">
											<CardTitle className="flex items-center text-base font-medium">
												<IconUser className="mr-2 h-5 w-5 shrink-0 text-primary" />
												<span className="line-clamp-2">
													{staff.userName ||
														staff.userEmail ||
														t("service_staff")}
												</span>
											</CardTitle>
											{staff.description ? (
												<CardDescription className="line-clamp-2">
													{staff.description}
												</CardDescription>
											) : null}
										</CardHeader>
									</Card>
								</Link>
							))}
						</div>
					)}

					{rsvpMode === RsvpMode.RESTAURANT && (
						<Link
							href={`${customerBasePath}/reservation/open`}
							className="group block touch-manipulation"
						>
							<Card className="border-border transition-shadow group-hover:shadow-md">
								<CardHeader className="space-y-1.5 p-4">
									<CardTitle className="flex items-center text-base font-medium">
										<IconCalendar className="mr-2 h-5 w-5 shrink-0 text-primary" />
										<span className="line-clamp-2">{store.name}</span>
									</CardTitle>
								</CardHeader>
							</Card>
						</Link>
					)}
				</section>
			) : null}

			<div className="flex flex-col gap-4 border-t border-border pt-4">
				<Button
					type="button"
					variant="outline"
					className="h-11 w-full touch-manipulation sm:h-10 sm:min-h-0 sm:w-auto"
					onClick={() => push("/faq")}
				>
					<IconHelp className="mr-2 h-4 w-4" />
					{t("f_a_q")}
				</Button>
				<LineAddFriendPrompt
					hasLineAccount={true}
					hasAddedOfficialAccount={false}
					variant="banner"
				/>
			</div>
		</div>
	);
}

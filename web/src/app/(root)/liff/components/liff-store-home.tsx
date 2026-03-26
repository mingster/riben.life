"use client";

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
import { useLiff } from "@/providers/liff-provider";
import type { RsvpSettings, StoreWithProducts } from "@/types";
import type { StoreFacility, StoreSettings } from "@prisma/client";
import {
	IconCalendar,
	IconHelp,
	IconShoppingCart,
	IconUserPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface LiffStoreHomeProps {
	store: StoreWithProducts;
	rsvpSettings: RsvpSettings;
	storeSettings: StoreSettings;
	useOrderSystem: boolean;
	acceptReservation: boolean;
	facilities: StoreFacility[];
}

/**
 * Compact LINE-friendly store home (no full-screen video). CTAs mirror the public
 * store landing; URLs use {@link useResolvedCustomerStoreBasePath} under LIFF layout (`/liff/…`) or `/s/{id}` on web.
 */
export function LiffStoreHome({
	store,
	rsvpSettings,
	storeSettings,
	useOrderSystem,
	acceptReservation,
	facilities,
}: LiffStoreHomeProps) {
	const { t } = useTranslation();
	const router = useRouter();
	const { ready, profile } = useLiff();
	const customerBasePath = useResolvedCustomerStoreBasePath(store.id);

	const push = (suffix: string) => {
		router.push(`${customerBasePath}${suffix}`);
	};

	const showGreeting = ready && Boolean(profile?.displayName?.trim());

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
				{rsvpSettings.waitlistEnabled ? (
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

			{acceptReservation && facilities.length > 0 ? (
				<section className="space-y-3">
					<div>
						<h2 className="text-base font-semibold sm:text-lg">
							{t("reservation")}
						</h2>
						<p className="text-xs font-mono text-gray-500 sm:text-sm">
							{t("reserve_a_space_description")}
						</p>
					</div>
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

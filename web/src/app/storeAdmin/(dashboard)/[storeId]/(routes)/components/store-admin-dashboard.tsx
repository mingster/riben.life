"use client";

import type { RsvpSettings, Store } from "@/types";

import Container from "@/components/ui/container";
//import { CashCashier } from "../cash-cashier/data-client";
import { Awaiting4ConfirmationClient } from "../order/awaiting4Confirmation/client";
import { RsvpStats } from "./rsvp-stats";

export interface props {
	store: Store;
	isProLevel: boolean;
	rsvpSettings: RsvpSettings | null;
}

// store admin home page.
// it checks for new orders every 5 seconds.
export const StoreAdminDashboard: React.FC<props> = ({
	store,
	isProLevel,
	rsvpSettings,
}) => {
	//const { lng } = useI18n();
	//const { t } = useTranslation(lng);

	//console.log(JSON.stringify(storeData));
	//console.log("autoAcceptOrder", store.autoAcceptOrder);

	/*
  {store.level === StoreLevel.Free && !store.autoAcceptOrder && (
	<Awaiting4ConfirmationClient store={store} />
  )}
  <Awaiting4ProcessingClient store={store} />
  */

	return (
		<section className="relative w-full">
			<Container>
				{
					//show cash cashier if store subscribes pro level (not free)
					//isProLevel && <CashCashier store={store} tables={[]} />
				}
				{store.useOrderSystem && (
					<>
						{!isProLevel && !store.autoAcceptOrder && (
							<Awaiting4ConfirmationClient store={store} />
						)}
					</>
				)}
				{rsvpSettings?.acceptReservation && (
					<RsvpStats
						rsvpSettings={rsvpSettings}
						defaultCurrency={store.defaultCurrency}
						storeTimezone={store.defaultTimezone || "Asia/Taipei"}
					/>
				)}
			</Container>
		</section>
	);
};

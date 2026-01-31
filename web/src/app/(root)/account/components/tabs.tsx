"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import type { StoreOrder, User } from "@/types";
import type { Address, SystemNotificationSettings } from "@prisma/client";
import { AddressesTab } from "./tab-address";
import { OrderTab } from "./tab-orders";
import { DisplayCreditLedger } from "@/components/display-credit-ledger";
import { Card, CardContent } from "@/components/ui/card";
import { DisplayReservations } from "@/components/display-reservations";

const VALID_TABS = ["orders", "reservations", "credits", "address"] as const;

export interface iUserTabProps {
	orders: StoreOrder[] | [];
	addresses: Address[] | [];
	user: User;
	systemSettings?: SystemNotificationSettings | null;
}

export const AccountTabs: React.FC<iUserTabProps> = ({
	orders,
	addresses,
	user,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const STORAGE_KEY = "account-tab-selection";

	// Get initial tab: URL hash > URL param > localStorage > default
	const getInitialTab = (): string => {
		if (typeof window === "undefined") return "orders";

		// 1. URL hash: e.g. /account/order-history#reservations
		const hash = window.location.hash.slice(1);
		if (hash && VALID_TABS.includes(hash as (typeof VALID_TABS)[number])) {
			localStorage.setItem(STORAGE_KEY, hash);
			return hash;
		}

		// 2. URL search param: ?tab=reservations
		const urlParams = new URLSearchParams(window.location.search);
		const urlTab = urlParams.get("tab");
		if (urlTab && VALID_TABS.includes(urlTab as (typeof VALID_TABS)[number])) {
			localStorage.setItem(STORAGE_KEY, urlTab);
			return urlTab;
		}

		// 3. localStorage
		const storedTab = localStorage.getItem(STORAGE_KEY);
		if (
			storedTab &&
			VALID_TABS.includes(storedTab as (typeof VALID_TABS)[number])
		) {
			return storedTab;
		}

		return "orders";
	};

	const [activeTab, setActiveTab] = useState<string>(() => getInitialTab());
	const [loading, _setLoading] = useState(false);

	// Sync tab when URL hash changes (e.g. link with #reservations)
	useEffect(() => {
		const onHashChange = () => {
			const hash = window.location.hash.slice(1);
			if (hash && VALID_TABS.includes(hash as (typeof VALID_TABS)[number])) {
				setActiveTab(hash);
				localStorage.setItem(STORAGE_KEY, hash);
			}
		};
		window.addEventListener("hashchange", onHashChange);
		return () => window.removeEventListener("hashchange", onHashChange);
	}, []);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, value);
			const url = new URL(window.location.href);
			url.hash = value;
			window.history.replaceState(null, "", url.toString());
		}
	};
	//console.log('selectedTab: ' + activeTab);

	if (loading) {
		return <Loader />;
	}

	//console.log(`user: ${JSON.stringify(user.Rsvp)}`);
	/*					<TabsTrigger className="px-5 lg:min-w-40" value="address">
						{t("account_tabs_address")}
					</TabsTrigger>
*/
	return (
		<Container className="bg-transparent">
			<Tabs
				value={activeTab}
				defaultValue="orders"
				onValueChange={handleTabChange}
				className=""
			>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger className="px-5 lg:min-w-40" value="orders">
						{t("account_tabs_orders")}
					</TabsTrigger>

					<TabsTrigger className="px-5 lg:min-w-40" value="reservations">
						{t("account_tabs_reservations")}
					</TabsTrigger>

					<TabsTrigger className="px-5 lg:min-w-40" value="credits">
						{t("account_tabs_credits")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="orders">
					<OrderTab orders={orders} />
				</TabsContent>
				<TabsContent value="reservations">
					<Card>
						<CardContent className="space-y-0">
							<DisplayReservations
								reservations={user.Reservations}
								user={user}
								showStatusFilter={true}
							/>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="credits">
					<Card>
						<CardContent className="space-y-0">
							<div className="flex flex-col gap-1">
								{user?.CustomerFiat && (
									<div className="flex items-center gap-1">
										{t("customer_fiat_amount")}:{" "}
										<span className="font-semibold">
											{Number(user.CustomerFiat.fiat) || 0}
										</span>
									</div>
								)}
								<DisplayCreditLedger ledger={user.CustomerFiatLedger} />
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="address">
					<AddressesTab addresses={addresses} />
				</TabsContent>

				{/*
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle> </CardTitle>
              <CardDescription> </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="current">Current password</Label>
                <Input id="current" type="password" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="new">New password</Label>
                <Input id="new" type="password" />
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save password</Button>
            </CardFooter>
          </Card>
        </TabsContent> */}
			</Tabs>
		</Container>
	);
};

"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import type { StoreOrder, User } from "@/types";
import type { Address } from "@prisma/client";
import { AddressesTab } from "./tab-address";
import { OrderTab } from "./tab-orders";
import { DisplayCreditLedger } from "@/components/display-credit-ledger";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from "@/components/ui/card";
import { DisplayReservations } from "@/components/display-reservations";

export interface iUserTabProps {
	orders: StoreOrder[] | [];
	addresses: Address[] | [];
	user: User;
}

export const AccountTabs: React.FC<iUserTabProps> = ({
	orders,
	addresses,
	user,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const STORAGE_KEY = "account-tab-selection";

	// Get initial tab: URL param > localStorage > default
	const getInitialTab = (): string => {
		// Try to get from URL params first (client-side only)
		if (typeof window !== "undefined") {
			const urlParams = new URLSearchParams(window.location.search);
			const urlTab = urlParams.get("tab");
			if (urlTab) {
				// Save to localStorage for consistency
				localStorage.setItem(STORAGE_KEY, urlTab);
				return urlTab;
			}

			// Try to get from localStorage
			const storedTab = localStorage.getItem(STORAGE_KEY);
			if (storedTab) return storedTab;
		}

		return "orders"; // default
	};

	const [activeTab, setActiveTab] = useState<string>(() => getInitialTab());
	const [loading, _setLoading] = useState(false);

	const handleTabChange = (value: string) => {
		// Update the state
		setActiveTab(value);

		// Save to localStorage
		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, value);
		}
	};
	//console.log('selectedTab: ' + activeTab);

	if (loading) {
		return <Loader />;
	}

	//console.log(`user: ${JSON.stringify(user.Rsvp)}`);
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

					<TabsTrigger className="px-5 lg:min-w-40" value="address">
						{t("account_tabs_address")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="orders">
					<OrderTab orders={orders} />
				</TabsContent>
				<TabsContent value="reservations">
					<Card>
						<CardHeader>
							<CardTitle> </CardTitle>
							<CardDescription> </CardDescription>
						</CardHeader>

						<CardContent className="space-y-2">
							<DisplayReservations reservations={user.Reservations} user={user} />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="credits">
					<Card>
						<CardHeader>
							<CardTitle> </CardTitle>
							<CardDescription> </CardDescription>
						</CardHeader>

						<CardContent className="space-y-2">
							<DisplayCreditLedger ledger={user.CustomerCreditLedger} />
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

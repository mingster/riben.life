"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import type { StoreOrder, User } from "@/types";
import type { Address } from "@prisma/client";
import { AddressesTab } from "./address-tab";
import { OrderTab } from "./order-tab";
import SettingsTab from "./settings-tab";

export interface iUserTabProps {
	orders: StoreOrder | null;
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

	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState(initialTab || "orders"); //show order tab by default
	const [loading, _setLoading] = useState(false);

	const handleTabChange = (value: string) => {
		//update the state
		setActiveTab(value);
		// update the URL query parameter
		//router.push({ query: { tab: value } });
	};

	// if the query parameter changes, update the state
	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);
	//console.log('selectedTab: ' + activeTab);

	if (loading) {
		return <Loader />;
	}

	return (
		<Container className="bg-transparent">
			<Tabs
				value={activeTab}
				defaultValue="orders"
				onValueChange={handleTabChange}
				className=""
			>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger className="px-5 lg:min-w-40" value="orders">
						{t("account_tabs_orders")}
					</TabsTrigger>
					<TabsTrigger className="px-5 lg:min-w-40" value="address">
						{t("account_tabs_address")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="orders">
					<OrderTab orders={orders} />
				</TabsContent>
				<TabsContent value="address">
					<AddressesTab addresses={addresses} />
				</TabsContent>

				<TabsContent value="account">
					<SettingsTab user={user} />
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

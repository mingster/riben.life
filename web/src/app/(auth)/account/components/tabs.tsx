"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";

import Container from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import type { StoreOrder, User } from "@/types";
import { OrderTab } from "./order-tab";
import SettingsTab from "./settings-tab";

type props = { user: User };

export const AccountTabs = ({ user }: props) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const { data: session, status } = useSession();
	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab");
	const [activeTab, setActiveTab] = useState(initialTab || "orders"); //show order tab by default

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

	const title = t("account_page_title");

	return (
		<Container>
			<Heading title={title} description={""} />

			<Tabs
				value={activeTab}
				defaultValue="orders"
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="orders">{t("account_tabs_orders")}</TabsTrigger>
					<TabsTrigger value="address">{t("account_tabs_address")}</TabsTrigger>
					<TabsTrigger value="account">{t("account_tabs_account")}</TabsTrigger>
					{/*<TabsTrigger value="password">
            {t("account_tabs_password")}
          </TabsTrigger>
          */}
				</TabsList>

				<TabsContent value="orders">
					<OrderTab orders={user.Orders as StoreOrder[]} />
				</TabsContent>
				<TabsContent value="address">&nbsp;</TabsContent>

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

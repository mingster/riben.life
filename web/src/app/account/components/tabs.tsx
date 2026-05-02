"use client";

import { useEffect, useState } from "react";
import { DisplayCreditLedger } from "@/components/display-credit-ledger";
import { DisplayReservations } from "@/components/display-reservations";
import { Loader } from "@/components/loader";
import Container from "@/components/ui/container";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import type { CurrentUser } from "@/types/current-user";
import type { Address } from "@prisma/client";
import { AddressesTab } from "./tab-address";
import { OrderTab } from "./tab-orders";

const VALID_TABS = ["orders", "reservations", "credits", "address"] as const;

/** Mobile 2×2 tab grid: avoid default TabsList `h-9` squashing rows; 44px min tap target. */
const accountTabTriggerClassName =
	"h-auto min-h-11 whitespace-normal px-2 py-2 text-center text-xs leading-snug touch-manipulation sm:min-h-0 sm:h-[calc(100%-1px)] sm:whitespace-nowrap sm:px-5 sm:py-1 sm:text-sm lg:min-w-40";

export interface iUserTabProps {
	orders: CurrentUser["Orders"];
	addresses: Address[] | [];
	user: CurrentUser;
}

export const AccountTabs: React.FC<iUserTabProps> = ({
	orders,
	addresses,
	user,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const STORAGE_KEY = "account-tab-selection";

	const getInitialTab = (): string => {
		if (typeof window === "undefined") {
			return "orders";
		}

		const hash = window.location.hash.slice(1);
		if (hash && VALID_TABS.includes(hash as (typeof VALID_TABS)[number])) {
			localStorage.setItem(STORAGE_KEY, hash);
			return hash;
		}

		const urlParams = new URLSearchParams(window.location.search);
		const urlTab = urlParams.get("tab");
		if (urlTab && VALID_TABS.includes(urlTab as (typeof VALID_TABS)[number])) {
			localStorage.setItem(STORAGE_KEY, urlTab);
			return urlTab;
		}

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

	if (loading) {
		return <Loader />;
	}

	return (
		<Container className="bg-transparent">
			<Tabs
				value={activeTab}
				defaultValue="orders"
				onValueChange={handleTabChange}
			>
				<TabsList className="grid h-auto w-full grid-cols-2 items-stretch gap-1.5 p-1 sm:h-9 sm:grid-cols-4 sm:gap-0 sm:p-[3px]">
					<TabsTrigger className={accountTabTriggerClassName} value="orders">
						{t("account_tabs_orders")}
					</TabsTrigger>
					<TabsTrigger
						className={accountTabTriggerClassName}
						value="reservations"
					>
						{t("account_tabs_reservations")}
					</TabsTrigger>
					<TabsTrigger className={accountTabTriggerClassName} value="credits">
						{t("account_tabs_credits")}
					</TabsTrigger>
					<TabsTrigger className={accountTabTriggerClassName} value="address">
						{t("account_tabs_address")}
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
								{user?.CustomerCredit && (
									<div className="flex items-center gap-1">
										{t("customer_fiat_amount")}:{" "}
										<span className="font-semibold">
											{Number(user.CustomerCredit.fiat) || 0}
										</span>
									</div>
								)}
								<DisplayCreditLedger ledger={user.CustomerCreditLedger} />
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="address">
					<AddressesTab addresses={addresses} />
				</TabsContent>
			</Tabs>
		</Container>
	);
};

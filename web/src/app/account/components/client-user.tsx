"use client";

import {
	PasskeysCard,
	ProvidersCard,
	SessionsCard,
	TwoFactorCard,
} from "@daveyplate/better-auth-ui";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useTranslation } from "@/app/i18n/client";
import LineLoginButton from "@/components/auth/button-line-login";
import { LineAddFriendPrompt } from "@/components/line-add-friend-prompt";
import { Loader } from "@/components/loader";
import { Card, CardContent } from "@/components/ui/card";
import Container from "@/components/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import type { CurrentUser } from "@/types/current-user";
import type { SystemNotificationSettings } from "@prisma/client";
import { AccountOrdersTab } from "./account-orders-tab";
import EditUser from "./edit-user";
import { ClientUserPreferences } from "../notifications/preferences/components/client-user-preferences";

/** Mobile 2×2 tab grid: avoid default TabsList `h-9` squashing rows; 44px min tap target. */
const accountTabTriggerClassName =
	"h-auto min-h-11 whitespace-normal px-2 py-2 text-center text-xs leading-snug touch-manipulation sm:min-h-0 sm:h-[calc(100%-1px)] sm:whitespace-nowrap sm:px-5 sm:py-1 sm:text-sm lg:min-w-40";

export interface iUserTabProps {
	user: CurrentUser;
	systemSettings: SystemNotificationSettings | null;
}

export const UserClient: React.FC<iUserTabProps> = ({
	user,
	systemSettings,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);

	const searchParams = useSearchParams();
	const initialTab = searchParams.get("tab");

	const [activeTab, setActiveTab] = useState(initialTab || "user");
	const [loading, _setLoading] = useState(false);

	const handleTabChange = (value: string) => {
		setActiveTab(value);
	};

	useEffect(() => {
		if (initialTab) setActiveTab(initialTab);
	}, [initialTab]);

	if (loading) {
		return <Loader />;
	}

	return (
		<Container className="bg-transparent py-10 sm:py-12">
			<Tabs
				value={activeTab}
				defaultValue="user"
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid h-auto w-full grid-cols-2 items-stretch gap-1.5 p-1 sm:h-9 sm:grid-cols-4 sm:gap-0 sm:p-[3px]">
					<TabsTrigger className={accountTabTriggerClassName} value="user">
						{t("account_tabs_account")}
					</TabsTrigger>
					<TabsTrigger className={accountTabTriggerClassName} value="orders">
						{t("account_tabs_orders")}
					</TabsTrigger>
					<TabsTrigger className={accountTabTriggerClassName} value="providers">
						{t("account_tabs_providers")}
					</TabsTrigger>
					<TabsTrigger
						className={accountTabTriggerClassName}
						value="notifications"
					>
						{t("account_tabs_notifications")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="user">
					<EditUser serverData={user} />
				</TabsContent>

				<TabsContent value="orders">
					<AccountOrdersTab user={user} />
				</TabsContent>

				<TabsContent value="providers">
					{user.line_userId && !user.lineOfficialAccountAdded && (
						<div className="mb-4">
							<LineAddFriendPrompt
								hasLineAccount={Boolean(user.line_userId)}
								hasAddedOfficialAccount={Boolean(user.lineOfficialAccountAdded)}
								variant="banner"
							/>
						</div>
					)}
					<div className="grid grid-cols-3 gap-2 pt-3 pb-3">
						<div className="flex flex-col gap-2 items-center justify-center bg-gray-900 p-0 rounded-md">
							<ProvidersCard
								classNames={{
									base: "",
									header: "",
									title: "text-sm",
									description: "text-muted-foreground",
									content: "bg-transparent",
									footer: "",
									button: "",
								}}
								accounts={user.accounts}
							/>
							{!user.line_userId && <LineLoginButton callbackUrl="/account" />}
						</div>

						<PasskeysCard
							classNames={{
								base: "",
								header: "",
								title: "",
								description: "",
							}}
						/>
						<TwoFactorCard
							classNames={{
								base: "",
								header: "",
								title: "",
								description: "",
								content: "bg-transparent",
								footer: "",
								button: "",
							}}
						/>
					</div>
					<SessionsCard
						classNames={{
							base: "",
							header: "",
							title: "text-sm",
							description: "text-muted-foreground",
							content: "bg-transparent",
							footer: "",
							button: "",
						}}
					/>
				</TabsContent>

				<TabsContent value="notifications">
					<Card>
						<CardContent>
							<ClientUserPreferences systemSettings={systemSettings} />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</Container>
	);
};

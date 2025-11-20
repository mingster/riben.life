"use client";
import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import { Loader } from "@/components/loader";

import { toastError, toastSuccess } from "@/components/toaster";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import { type SubscriptionForUI } from "@/types/enum";
import { format } from "date-fns";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface iUserTabProps {
	user: User | null;
	stripeSubscription: SubscriptionForUI[];
}

export const ManageUserClient: React.FC<iUserTabProps> = ({
	user,
	stripeSubscription,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const params = useParams();
	const storeId = params.storeId as string;
	const searchParams = useSearchParams();

	// State management
	const [activeTab, setActiveTab] = useState(
		() => searchParams.get("tab") || "info",
	);
	const [loading, setLoading] = useState(false);
	const [subscriptions, setSubscriptions] = useState<SubscriptionForUI[]>(
		stripeSubscription || [],
	);
	const [mounted, setMounted] = useState(false);

	// Memoized values
	const initialTab = useMemo(() => searchParams.get("tab"), [searchParams]);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);

	// Effects
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (initialTab) {
			setActiveTab(initialTab);
		}
	}, [initialTab]);

	// Handlers
	const handleTabChange = useCallback((value: string) => {
		setActiveTab(value);
	}, []);

	// Early returns
	if (!mounted) return null;
	if (loading) return <Loader />;

	const link_home = `/storeAdmin/${storeId}`;
	const link_customers = `/storeAdmin/${storeId}/customers`;
	const userDisplayName = user?.name || user?.email || "";

	return (
		<div className="space-y-6">
			<Breadcrumb className="mb-2">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={link_home}>{t("StoreDashboard")}</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={link_customers}>{t("Customers")}</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>{userDisplayName}</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<Tabs
				value={activeTab}
				onValueChange={handleTabChange}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="info" className="px-5 lg:min-w-40">
						{t("subscription_tabs_info")}
					</TabsTrigger>
					<TabsTrigger value="billing" className="px-5 lg:min-w-40">
						{t("subscription_tabs_billing")}
					</TabsTrigger>
					<TabsTrigger value="devices" className="px-5 lg:min-w-40">
						{t("subscription_tabs_devices")}
					</TabsTrigger>
					<TabsTrigger value="stats" className="px-5 lg:min-w-40">
						Stats
					</TabsTrigger>
				</TabsList>

				<TabsContent value="info" className="space-y-4">
					<Card>
						<CardHeader>
							<Heading
								title={user?.name || user?.email}
								description="Manage User"
							/>

							<div className="text-lg font-semibold">
								{t("subscription_member_since").replace(
									"{0}",
									format(user?.createdAt, datetimeFormat),
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<div className="flex items-center">
									<span className="text-sm text-muted-foreground">
										{t("subscription_service_expiration").replace("{0}", "")}
									</span>
									<span className="font-medium">
										{format(user?.createdAt, datetimeFormat)}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="billing"></TabsContent>

				<TabsContent value="stats">
					<div className="grid grid-cols-2 text-xs gap-1 pb-4"></div>
				</TabsContent>
			</Tabs>
		</div>
	);
};

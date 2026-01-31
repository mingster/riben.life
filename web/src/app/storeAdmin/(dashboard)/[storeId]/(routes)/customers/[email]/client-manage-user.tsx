"use client";
import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import { Loader } from "@/components/loader";

import { DisplayCreditLedger } from "@/components/display-credit-ledger";
import { DisplayOrders } from "@/components/display-orders";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import type { StoreOrder, User } from "@/types";
import { type SubscriptionForUI } from "@/types/enum";
import { format } from "date-fns";
import { epochToDate } from "@/utils/datetime-utils";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditCustomer } from "../components/edit-customer";
import { DisplayReservations } from "@/components/display-reservations";

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
	// Maintain client state for user data
	const [clientUser, setClientUser] = useState<User | null>(user);

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

	// Handle user updates from EditCustomer component
	const handleUserUpdated = useCallback((updatedUser: User) => {
		setClientUser(updatedUser);
	}, []);

	// Sync clientUser with prop when user prop changes
	useEffect(() => {
		if (user) {
			setClientUser(user);
		}
	}, [user]);

	// Early returns
	if (!mounted) return null;
	if (loading) return <Loader />;

	const link_home = `/storeAdmin/${storeId}`;
	const link_customers = `/storeAdmin/${storeId}/customers`;
	const userDisplayName = clientUser?.name || clientUser?.email || "";

	return (
		<div className="space-y-6">
			<Breadcrumb className="mb-2">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={link_home}>{t("store_dashboard")}</Link>
						</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink asChild>
							<Link href={link_customers}>{t("customers")}</Link>
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
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="info" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_info")}
					</TabsTrigger>
					<TabsTrigger value="billing" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_billing")}
					</TabsTrigger>
					<TabsTrigger value="credits" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_credits")}
					</TabsTrigger>
					<TabsTrigger value="rsvp" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_rsvp")}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="info" className="space-y-4">
					<Card>
						<CardHeader>
							<div className="flex items-center">
								<Heading
									title={clientUser?.name || clientUser?.email || ""}
									description={t("user_mgmt_descr")}
								/>
								{clientUser && (
									<EditCustomer
										item={clientUser}
										onUpdated={handleUserUpdated}
									/>
								)}
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex flex-col gap-1">
								{clientUser?.createdAt && (
									<span className=" text-muted-foreground">
										{t("customer_mgmt_member_since").replace(
											"{0}",
											format(
												typeof clientUser.createdAt === "number"
													? (epochToDate(BigInt(clientUser.createdAt)) ??
															new Date())
													: clientUser.createdAt instanceof Date
														? clientUser.createdAt
														: new Date(),
												datetimeFormat,
											),
										)}
									</span>
								)}

								{/*
								user.createdAt && (
									<span className=" text-muted-foreground">
										{t("subscription_service_expiration").replace("{0}", "")}
										{format(
											typeof user.createdAt === "number"
												? (epochToDate(BigInt(user.createdAt)) ?? new Date())
												: user.createdAt instanceof Date
													? user.createdAt
													: new Date(),
											datetimeFormat,
										)}
									</span>
								)
								*/}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="billing">
					<Card>
						<CardHeader>
							<div className="flex items-center"></div>
						</CardHeader>
						<CardContent className="space-y-4">
							<DisplayOrders
								orders={(clientUser?.Orders as StoreOrder[]) || []}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="credits">
					<Card>
						<CardContent className="space-y-4">
							<CardHeader></CardHeader>
							<div className="flex flex-col gap-1">
								{clientUser?.CustomerCredit && (
									<div className="flex items-center gap-1">
										{t("customer_credit_balance")}:{" "}
										<span className="font-semibold">
											{Number(clientUser.CustomerCredit.fiat) || 0}
										</span>
									</div>
								)}
								<DisplayCreditLedger ledger={clientUser?.CustomerFiatLedger} />
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="rsvp">
					<Card>
						<CardContent className="space-y-4">
							<CardHeader></CardHeader>
							<DisplayReservations
								reservations={clientUser?.Reservations ?? []}
								hideActions={true}
								storeId={storeId}
								showStatusFilter={true}
							/>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

"use client";
import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import { Loader } from "@/components/loader";

import { DisplayFiatLedger } from "@/components/display-fiat-ledger";
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
import type { StoreCustomerManageUser } from "@/lib/store-admin/get-store-customer-profile-for-manage";
import { formatCurrencyAmount, intlLocaleFromAppLang } from "@/lib/intl-locale";
import type { User } from "@/types";
import { type SubscriptionForUI } from "@/types/enum";
import { format } from "date-fns";
import { epochToDate, isDateValue } from "@/utils/datetime-utils";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EditCustomer } from "../components/edit-customer";
import { DisplayReservations } from "@/components/display-reservations";
import CurrencyComponent from "@/components/currency";
import { computeCustomerStoreStatsFromRelations } from "@/lib/store-admin/compute-customer-store-stats";

function getCustomerPhoneDisplay(user: StoreCustomerManageUser | null): string {
	if (!user) {
		return "";
	}
	const withPhone = user as StoreCustomerManageUser & {
		phoneNumber?: string | null;
	};
	return withPhone.phoneNumber?.trim() ? withPhone.phoneNumber : "";
}

function displayField(value: string | null | undefined): string {
	const s = typeof value === "string" ? value.trim() : "";
	return s.length > 0 ? s : "—";
}

export interface iUserTabProps {
	user: StoreCustomerManageUser | null;
	stripeSubscription: SubscriptionForUI[];
	storeCurrency: string;
}

export const ManageUserClient: React.FC<iUserTabProps> = ({
	user,
	stripeSubscription,
	storeCurrency,
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
	const [clientUser, setClientUser] = useState<StoreCustomerManageUser | null>(
		user,
	);

	// Memoized values
	const initialTab = useMemo(() => searchParams.get("tab"), [searchParams]);
	const datetimeFormat = useMemo(() => t("datetime_format"), [t]);
	const customerStats = useMemo(
		() =>
			computeCustomerStoreStatsFromRelations(
				clientUser?.Orders,
				clientUser?.Reservations,
				clientUser?.CustomerCredit ?? null,
			),
		[clientUser],
	);

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
		setClientUser((prev) =>
			prev ? ({ ...prev, ...updatedUser } as StoreCustomerManageUser) : null,
		);
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
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="info" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_info")}
					</TabsTrigger>
					<TabsTrigger value="billing" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_billing")}
					</TabsTrigger>
					<TabsTrigger value="credits" className="px-5 lg:min-w-40">
						{t("customer_mgmt_tabs_account_balance")}
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
						<CardContent className="space-y-6">
							<dl className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-1">
									<dt className="text-sm text-muted-foreground">
										{t("your_name")}
									</dt>
									<dd className="text-sm font-medium wrap-break-word">
										{displayField(clientUser?.name)}
									</dd>
								</div>
								<div className="space-y-1">
									<dt className="text-sm text-muted-foreground">
										{t("email")}
									</dt>
									<dd className="text-sm font-medium break-all">
										{displayField(clientUser?.email)}
									</dd>
								</div>
								<div className="space-y-1">
									<dt className="text-sm text-muted-foreground">
										{t("phone")}
									</dt>
									<dd className="text-sm font-medium wrap-break-word">
										{displayField(getCustomerPhoneDisplay(clientUser))}
									</dd>
								</div>
								<div className="space-y-1">
									<dt className="text-sm text-muted-foreground">
										{t("account_tabs_language")}
									</dt>
									<dd className="text-sm font-medium wrap-break-word">
										{displayField(clientUser?.locale)}
									</dd>
								</div>
								<div className="space-y-1 sm:col-span-2">
									<dt className="text-sm text-muted-foreground">
										{t("timezone")}
									</dt>
									<dd className="text-sm font-medium wrap-break-word">
										{displayField(clientUser?.timezone)}
									</dd>
								</div>
								<div className="space-y-1 sm:col-span-2">
									<dt className="text-sm text-muted-foreground">
										{t("customer_spending_reservations") ||
											"Total spending / reservations"}
									</dt>
									<dd className="flex flex-col gap-0.5 text-sm font-medium">
										<CurrencyComponent value={customerStats.totalSpending} />
										<span className="text-xs font-normal text-muted-foreground">
											{t("rsvp") || "RSVP"}:{" "}
											{customerStats.completedReservations}
										</span>
									</dd>
								</div>
								<div className="space-y-1 sm:col-span-2">
									<dt className="text-sm text-muted-foreground">
										{`${t("customer_fiat_amount")} / ${t("customer_credit_amount")}`}
									</dt>
									<dd className="flex flex-col gap-0.5 text-sm font-medium">
										<CurrencyComponent
											value={customerStats.customerCreditFiat}
										/>
										<span className="text-xs font-normal text-muted-foreground">
											{Number(customerStats.customerCreditPoint).toFixed(0)}
											{t("points") || "pts"}
										</span>
									</dd>
								</div>
							</dl>
							{clientUser?.createdAt && (
								<p className="text-sm text-muted-foreground">
									{t("customer_mgmt_member_since").replace(
										"{0}",
										format(
											typeof clientUser.createdAt === "number"
												? (epochToDate(BigInt(clientUser.createdAt)) ??
														new Date())
												: isDateValue(clientUser.createdAt)
													? clientUser.createdAt
													: new Date(),
											datetimeFormat,
										),
									)}
								</p>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="billing">
					<Card>
						<CardHeader>
							<div className="flex items-center"></div>
						</CardHeader>
						<CardContent className="space-y-4">
							<DisplayOrders orders={clientUser?.Orders ?? []} />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="credits">
					<Card>
						<CardContent className="space-y-4">
							<CardHeader></CardHeader>
							<div className="flex flex-col gap-3">
								<div className="flex flex-wrap items-center gap-1">
									<span>{t("customer_mgmt_account_balance")}</span>
									<span className="font-semibold">
										{formatCurrencyAmount(
											Number(clientUser?.CustomerCredit?.fiat ?? 0) || 0,
											storeCurrency,
											intlLocaleFromAppLang(lng),
										)}
									</span>
								</div>
								<DisplayFiatLedger
									currency={storeCurrency}
									ledger={clientUser?.CustomerFiatLedger ?? []}
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value="rsvp">
					<Card>
						<CardContent className="space-y-4">
							<CardHeader></CardHeader>
							<DisplayReservations
								reservations={clientUser?.Reservations || []}
								user={clientUser}
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

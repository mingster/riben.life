"use client";
import { useTranslation } from "@/app/i18n/client";
import { Heading } from "@/components/heading";
import { Loader } from "@/components/loader";

import { DisplayOrders } from "@/components/display-orders";

import { toastError, toastSuccess } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/providers/i18n-provider";
import type { User } from "@/types";
import { SubscriptionForUI } from "@/types/enum";
import { format } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export interface iUserTabProps {
	user: User | null;
	stripeSubscription: SubscriptionForUI[];
	//orders: StoreOrder[];
}

export const ManageUserClient: React.FC<iUserTabProps> = ({
	user,
	stripeSubscription,
	//orders,
}) => {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
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

	const doCancelById = useCallback(
		async (id: string) => {
			const confirmed = window.confirm(
				"Are you sure you want to cancel this subscription?",
			);
			if (!confirmed) return;

			setLoading(true);

			try {
				const url = `${process.env.NEXT_PUBLIC_API_URL}/payment/stripe/cancel-subscription-by-id`;
				const body = JSON.stringify({
					//pstv_subscriber,
					user,
					schedule_id: id,
					note: "admin cancelled the subscription",
				});

				const response = await fetch(url, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const data = await response.json();
				const result = data.success as boolean;

				if (result) {
					// Update local state optimistically
					setSubscriptions((prev) =>
						prev.filter((schedule) => schedule.id !== id),
					);
					toastSuccess({ description: "Subscription cancelled." });
				} else {
					toastError({
						description:
							"Problem cancelling subscription. Please contact support.",
					});
				}
			} catch (error) {
				console.error("Error cancelling subscription:", error);
				toastError({
					description: "Failed to cancel subscription. Please try again.",
				});
			} finally {
				setLoading(false);
			}
		},
		[user],
	);

	// Memoized components
	const subscriptionItems = useMemo(
		() =>
			subscriptions.map((schedule) => (
				<div
					key={schedule.id}
					className="flex items-center gap-3 p-3 border rounded-lg"
				>
					<div className="font-medium">{schedule.productName}</div>
					<div className="text-sm text-muted-foreground">
						{t("subscription_start_date")}
						{format(schedule.start_date, datetimeFormat)}
					</div>
					<div className="text-sm text-muted-foreground">
						{schedule.productName}
					</div>
					<div className="text-sm text-muted-foreground">{schedule.status}</div>
					{schedule.canceled_at && (
						<div className="text-sm text-muted-foreground">
							{t("canceled_at")}: {format(schedule.canceled_at, datetimeFormat)}
						</div>
					)}
					{schedule.status !== "canceled" && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => doCancelById(schedule.id)}
							disabled={loading}
						>
							{t("cancel")}
						</Button>
					)}

					<div className="text-sm text-muted-foreground">
						<Link
							href={`https://dashboard.stripe.com/subscriptions/${schedule.id}`}
							target="_blank"
							rel="noopener noreferrer"
							className="text-green-500 hover:text-amber-50"
						>
							{schedule.id}
						</Link>
					</div>
				</div>
			)),
		[subscriptions, t, datetimeFormat, doCancelById, loading],
	);

	// Early returns
	if (!mounted) return null;
	if (loading) return <Loader />;

	return (
		<div className="space-y-6">
			<Heading title={user?.email} description="Manage User" />

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
				</TabsList>

				<TabsContent value="info" className="space-y-4">
					<Card>
						<CardHeader>
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

								{subscriptions.length > 0 && (
									<div className="space-y-3">
										<div className="text-sm font-medium text-muted-foreground">
											{t("subscription_billing")}
										</div>
										<div className="space-y-2">{subscriptionItems}</div>
									</div>
								)}

								<div className="pt-4 border-t">
									<span className="text-sm text-muted-foreground">
										{t("subscription_billing_portal1")}
									</span>
									<Link
										className="text-primary hover:underline mx-1"
										target="_blank"
										rel="noopener noreferrer"
										href="https://billing.stripe.com/p/login/8wM00KbhzeBv3e03cc"
									>
										{t("subscription_billing_portal")}
									</Link>
									<span className="text-sm text-muted-foreground">
										{t("subscription_billing_portal2")}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="billing">
					<DisplayOrders orders={user?.Orders} />
				</TabsContent>
			</Tabs>
		</div>
	);
};

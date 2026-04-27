"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { ClipLoader } from "react-spinners";
import { downgradeStoreToFreeAction } from "@/actions/storeAdmin/subscription/downgrade-store-to-free";
import { useTranslation } from "@/app/i18n/client";
import { AlertModal } from "@/components/modals/alert-modal";
import { toastError, toastSuccess } from "@/components/toaster";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatInternalMinorForDisplay } from "@/lib/payment/stripe/stripe-money";
import { useI18n } from "@/providers/i18n-provider";
import { StoreLevel, SubscriptionStatus } from "@/types/enum";
import { formatCalendarDateInIanaTimeZone } from "@/utils/datetime-utils";

export type StoreBillingInvoiceRow = {
	id: string;
	paidAt: number | null;
	amount: number;
	currency: string;
	isPaid: boolean;
};

export interface StoreBillingClientProps {
	storeId: string;
	storeLevel: number;
	timezone: string;
	subscription: {
		status: number;
		expiration: number;
		subscriptionId: string | null;
	} | null;
	invoices: StoreBillingInvoiceRow[];
	billingInterval: "month" | "year" | null;
}

function planTitleKey(
	level: number,
):
	| "store_subscribe_plan_pro_title"
	| "store_subscribe_plan_multi_title"
	| "store_subscribe_plan_free_title" {
	if (level === StoreLevel.Multi) {
		return "store_subscribe_plan_multi_title";
	}
	if (level === StoreLevel.Pro) {
		return "store_subscribe_plan_pro_title";
	}
	return "store_subscribe_plan_free_title";
}

function subscriptionStatusKey(
	status: number,
):
	| "subscription_status_active"
	| "subscription_status_canceled"
	| "subscription_status_inactive" {
	if (status === SubscriptionStatus.Active) {
		return "subscription_status_active";
	}
	if (status === SubscriptionStatus.Cancelled) {
		return "subscription_status_canceled";
	}
	return "subscription_status_inactive";
}

export function StoreBillingClient({
	storeId,
	storeLevel,
	timezone,
	subscription,
	invoices,
	billingInterval,
}: StoreBillingClientProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const router = useRouter();

	const [portalLoading, setPortalLoading] = useState(false);
	const [freeModalOpen, setFreeModalOpen] = useState(false);
	const [freeLoading, setFreeLoading] = useState(false);

	const openPortal = useCallback(async () => {
		setPortalLoading(true);
		try {
			const res = await fetch(
				`/api/storeAdmin/${encodeURIComponent(storeId)}/billing-portal`,
				{ method: "POST" },
			);
			const data = (await res.json().catch(() => ({}))) as {
				url?: string;
				message?: string;
			};
			if (!res.ok || !data.url) {
				toastError({
					title: t("store_admin_subscribe_error_title"),
					description: data.message ?? t("store_admin_billing_portal_error"),
				});
				return;
			}
			window.location.href = data.url;
		} catch (err: unknown) {
			toastError({
				title: t("store_admin_subscribe_error_title"),
				description:
					err instanceof Error
						? err.message
						: t("store_admin_billing_portal_error"),
			});
		} finally {
			setPortalLoading(false);
		}
	}, [storeId, t]);

	const onConfirmFree = async () => {
		setFreeLoading(true);
		try {
			const result = await downgradeStoreToFreeAction(storeId, {});
			if (result?.serverError) {
				toastError({
					title: t("store_admin_subscribe_error_title"),
					description: result.serverError,
				});
				return;
			}
			toastSuccess({ description: t("store_subscribe_free_switched") });
			setFreeModalOpen(false);
			router.refresh();
			router.push(`/storeAdmin/${storeId}`);
		} catch (err: unknown) {
			toastError({
				title: t("store_admin_subscribe_error_title"),
				description:
					err instanceof Error
						? err.message
						: t("store_admin_subscribe_error_generic"),
			});
		} finally {
			setFreeLoading(false);
		}
	};

	const exp =
		subscription?.expiration != null ? new Date(subscription.expiration) : null;
	const renewalText =
		exp != null
			? formatCalendarDateInIanaTimeZone(exp, timezone, lng) ||
				t("store_admin_billing_renewal_unknown")
			: t("store_admin_billing_renewal_unknown");

	const planKey = planTitleKey(storeLevel);
	const statusKey = subscription
		? subscriptionStatusKey(subscription.status)
		: "subscription_status_inactive";

	const billingBusy = portalLoading || freeLoading;

	return (
		<div
			className="relative mx-auto flex max-w-4xl flex-col gap-6 px-0 sm:px-0"
			aria-busy={billingBusy}
		>
			<AlertModal
				isOpen={freeModalOpen}
				onClose={() => setFreeModalOpen(false)}
				onConfirm={() => void onConfirmFree()}
				loading={freeLoading}
				title={t("billing_downgrade_free_confirm_title")}
				description={t(
					billingInterval === "year"
						? "billing_downgrade_free_confirm_description_yearly"
						: "billing_downgrade_free_confirm_description_monthly",
				)}
			/>
			<div>
				<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
					{t("store_admin_billing_title")}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					{t("store_admin_billing_subtitle")}
				</p>
			</div>

			<Card className="border-border/80 bg-card/50">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
					<div className="space-y-1">
						<CardTitle className="text-lg">
							{t("store_admin_billing_current_plan")}
						</CardTitle>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-2xl font-semibold tracking-tight">
								{t(planKey)}
							</span>
							{billingInterval === "year" ? (
								<Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">
									{t("store_admin_billing_interval_yearly")}
								</Badge>
							) : billingInterval === "month" ? (
								<Badge variant="secondary">
									{t("store_admin_billing_interval_monthly")}
								</Badge>
							) : null}
							<Badge variant="outline">{t(statusKey)}</Badge>
						</div>
						<CardDescription className="pt-2 text-sm leading-relaxed"></CardDescription>
					</div>
					<Button
						variant="outline"
						size="sm"
						asChild
						className="shrink-0 touch-manipulation"
					>
						<Link href={`/storeAdmin/${storeId}/subscribe`}>
							{t("store_admin_billing_adjust_plan")}
						</Link>
					</Button>
				</CardHeader>
				<CardContent className="text-sm text-muted-foreground">
					{subscription != null && exp != null ? (
						subscription.status === SubscriptionStatus.Active ? (
							<p>
								{t("store_admin_billing_renews_on")}{" "}
								<span className="font-medium text-foreground">
									{renewalText}
								</span>
							</p>
						) : subscription.status === SubscriptionStatus.Cancelled ? (
							<p>
								{t("store_admin_billing_subscription_ended_on")}{" "}
								<span className="font-medium text-foreground">
									{renewalText}
								</span>
							</p>
						) : (
							<p>
								{t("store_admin_billing_period_ends_on")}{" "}
								<span className="font-medium text-foreground">
									{renewalText}
								</span>
							</p>
						)
					) : (
						<p>{t("store_admin_billing_plan_inactive_hint")}</p>
					)}
				</CardContent>
			</Card>

			<Card className="border-border/80 bg-card/50">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
					<div>
						<CardTitle className="text-lg">
							{t("store_admin_billing_payment_title")}
						</CardTitle>
						<CardDescription>
							{t("store_admin_billing_payment_descr")}
						</CardDescription>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="shrink-0 touch-manipulation"
						disabled={portalLoading}
						onClick={() => void openPortal()}
					>
						{portalLoading ? (
							<ClipLoader size={16} color="currentColor" />
						) : (
							t("store_admin_billing_manage_billing")
						)}
					</Button>
				</CardHeader>
			</Card>

			<Card className="border-border/80 bg-card/50">
				<CardHeader>
					<CardTitle className="text-lg">
						{t("store_admin_billing_invoices_title")}
					</CardTitle>
					<CardDescription>
						{t("store_admin_billing_invoices_descr")}
					</CardDescription>
				</CardHeader>
				<CardContent className="overflow-x-auto">
					{invoices.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{t("store_admin_billing_no_invoices")}
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("store_admin_billing_invoice_date")}</TableHead>
									<TableHead>
										{t("store_admin_billing_invoice_status")}
									</TableHead>
									<TableHead className="text-right">
										{t("store_admin_billing_invoice_amount")}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{invoices.map((row) => {
									const d = row.paidAt != null ? new Date(row.paidAt) : null;
									const dateStr =
										d != null
											? formatCalendarDateInIanaTimeZone(d, timezone, lng) ||
												"—"
											: "—";
									const amountStr = formatInternalMinorForDisplay(
										row.currency,
										row.amount,
										lng === "tw" ? "zh-TW" : "en-US",
									);
									return (
										<TableRow key={row.id}>
											<TableCell className="font-medium">{dateStr}</TableCell>
											<TableCell>
												{row.isPaid
													? t("store_admin_billing_invoice_paid")
													: t("store_admin_billing_invoice_pending")}
											</TableCell>
											<TableCell className="text-right tabular-nums">
												{amountStr}
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card className="border-destructive/30 bg-card/50">
				<CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
					<div>
						<CardTitle className="text-lg">
							{t("store_admin_billing_cancel_title")}
						</CardTitle>
						<CardDescription>
							{t("store_admin_billing_cancel_descr")}
						</CardDescription>
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="destructive"
							size="sm"
							className="touch-manipulation"
							disabled={billingBusy}
							onClick={() => setFreeModalOpen(true)}
						>
							{t("store_admin_billing_downgrade_free")}
						</Button>
					</div>
				</CardHeader>
			</Card>
		</div>
	);
}

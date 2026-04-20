import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getT } from "@/app/i18n";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { stripe } from "@/lib/payment/stripe/config";
import { StoreLevel } from "@/types/enum";
import { transformPrismaDataForJson } from "@/utils/utils";

import { StoreBillingClient } from "./components/store-billing-client";

export const metadata: Metadata = {
	title: "Billing",
};

export default async function StoreBillingPage(props: {
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		redirect(
			`/signIn?callbackUrl=${encodeURIComponent(`/storeAdmin/${params.storeId}/billing`)}`,
		);
	}

	await checkStoreStaffAccess(params.storeId);

	const store = await sqlClient.store.findFirst({
		where: { id: params.storeId },
		select: { id: true, level: true, defaultTimezone: true },
	});

	if (!store) {
		redirect("/storeAdmin");
	}

	const { t } = await getT();

	if (store.level === StoreLevel.Free) {
		return (
			<Container>
				<div className="mx-auto max-w-lg py-2">
					<Card>
						<CardHeader>
							<CardTitle>{t("store_admin_billing_free_cta_title")}</CardTitle>
							<CardDescription>
								{t("store_admin_billing_free_cta_descr")}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button asChild>
								<Link href={`/storeAdmin/${params.storeId}/subscribe`}>
									{t("subscription_page_title")}
								</Link>
							</Button>
						</CardContent>
					</Card>
				</div>
			</Container>
		);
	}

	const sub = await sqlClient.storeSubscription.findUnique({
		where: { storeId: params.storeId },
	});

	const paymentsRaw = await sqlClient.subscriptionPayment.findMany({
		where: { storeId: params.storeId },
		orderBy: [{ createdAt: "desc" }],
		take: 36,
	});

	transformPrismaDataForJson(paymentsRaw);

	type PayRow = (typeof paymentsRaw)[number];

	const invoices = paymentsRaw.map((p: PayRow) => ({
		id: p.id,
		paidAt: p.paidAt != null ? Number(p.paidAt) : null,
		amount: Number(p.amount),
		currency: String(p.currency),
		isPaid: Boolean(p.isPaid),
	}));

	const latestPaid = paymentsRaw.find((p: PayRow) => p.isPaid);
	let billingInterval: "month" | "year" | null = null;
	if (sub?.subscriptionId) {
		try {
			const stripeSub = await stripe.subscriptions.retrieve(
				sub.subscriptionId,
				{
					expand: ["items.data.price"],
				},
			);
			const priceObj = stripeSub.items.data[0]?.price;
			const interval =
				typeof priceObj === "object" &&
				priceObj !== null &&
				"recurring" in priceObj
					? priceObj.recurring?.interval
					: undefined;
			if (interval === "year") {
				billingInterval = "year";
			} else if (interval === "month") {
				billingInterval = "month";
			}
		} catch {
			billingInterval = null;
		}
	}
	if (billingInterval === null) {
		const stripePriceId =
			typeof latestPaid?.stripePriceId === "string"
				? latestPaid.stripePriceId.trim()
				: "";
		if (stripePriceId) {
			try {
				const price = await stripe.prices.retrieve(stripePriceId);
				if (price.recurring?.interval === "year") {
					billingInterval = "year";
				} else if (price.recurring?.interval === "month") {
					billingInterval = "month";
				}
			} catch {
				billingInterval = null;
			}
		}
	}

	const subscriptionPayload =
		sub != null
			? {
					status: sub.status,
					expiration: Number(sub.expiration),
					subscriptionId: sub.subscriptionId,
				}
			: null;

	return (
		<Container>
			<div className="py-2">
				<StoreBillingClient
					storeId={params.storeId}
					storeLevel={store.level}
					timezone={store.defaultTimezone}
					subscription={subscriptionPayload}
					invoices={invoices}
					billingInterval={billingInterval}
				/>
			</div>
		</Container>
	);
}

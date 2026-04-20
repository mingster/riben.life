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
import { auth } from "@/lib/auth";
import { sqlClient } from "@/lib/prismadb";
import { checkStoreStaffAccess } from "@/lib/store-admin-utils";
import { stripe } from "@/lib/payment/stripe/config";
import {
	groupSubscriptionPrices,
	serializeGroupedSubscriptionPrices,
} from "@/lib/subscription/resolve-product-prices";
import StoreSubscribeClient from "./components/store-subscribe-client";

export const metadata: Metadata = {
	title: "Subscription",
};

export default async function StoreSubscribePage(props: {
	params: Promise<{ storeId: string }>;
}) {
	const params = await props.params;
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	if (!session?.user?.id) {
		redirect(
			`/signIn?callbackUrl=${encodeURIComponent(`/storeAdmin/${params.storeId}/subscribe`)}`,
		);
	}

	await checkStoreStaffAccess(params.storeId);

	const { t } = await getT();

	const setting = await sqlClient.platformSettings.findFirst();
	const productId = setting?.stripeProductId?.trim();

	if (!productId) {
		return (
			<Card className="mx-auto max-w-lg border-destructive/50">
				<CardHeader>
					<CardTitle>{t("store_admin_subscribe_error_title")}</CardTitle>
					<CardDescription>
						{t("store_subscribe_missing_product_config")}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button variant="outline" asChild>
						<Link href={`/storeAdmin/${params.storeId}`}>
							{t("store_admin_subscribe_back_dashboard")}
						</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	const storeRow = await sqlClient.store.findFirst({
		where: { id: params.storeId },
		select: { level: true, defaultCurrency: true },
	});

	let pricesList: Awaited<ReturnType<typeof stripe.prices.list>>["data"] = [];
	try {
		const res = await stripe.prices.list({
			product: productId,
			active: true,
			limit: 100,
		});
		pricesList = res.data;
	} catch {
		pricesList = [];
	}

	const grouped = groupSubscriptionPrices(pricesList, {
		productId,
		legacyStripePriceId: setting?.stripePriceId ?? null,
	});
	const groupedPrices = serializeGroupedSubscriptionPrices(grouped, {
		presentmentCurrency: storeRow?.defaultCurrency ?? undefined,
	});

	let productLabel: string | null = null;
	try {
		const product = await stripe.products.retrieve(productId);
		productLabel = product.name ?? null;
	} catch {
		productLabel = null;
	}
	const sub = await sqlClient.storeSubscription.findUnique({
		where: { storeId: params.storeId },
		select: { expiration: true, subscriptionId: true, status: true },
	});

	let stripeBillingInterval: "month" | "year" | null = null;
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
				stripeBillingInterval = "year";
			} else if (interval === "month") {
				stripeBillingInterval = "month";
			}
		} catch {
			stripeBillingInterval = null;
		}
	}

	const storeLevel = storeRow?.level ?? 1;
	const subscriptionExpirationMs =
		sub?.expiration != null ? Number(sub.expiration) : null;

	return (
		<div className="mx-auto flex max-w-6xl flex-col gap-8 px-3 sm:px-4 lg:px-6">
			<div className="text-center">
				<h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
					{t("subscription_page_title")}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground sm:text-base">
					{t("store_subscribe_hero_subtitle")}
				</p>
			</div>
			<StoreSubscribeClient
				storeId={params.storeId}
				groupedPrices={groupedPrices}
				storeLevel={storeLevel}
				subscriptionExpirationMs={subscriptionExpirationMs}
				productLabel={productLabel}
				stripeSubscriptionId={sub?.subscriptionId ?? null}
				stripeBillingInterval={stripeBillingInterval}
				storeSubscriptionStatus={sub?.status ?? null}
			/>
		</div>
	);
}

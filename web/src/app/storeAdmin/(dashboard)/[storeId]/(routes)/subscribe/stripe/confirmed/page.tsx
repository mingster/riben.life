import Link from "next/link";
import { notFound } from "next/navigation";
import confirmSubscriptionPayment from "@/actions/storeAdmin/subscription/stripe/confirm-payment";
import { getT } from "@/app/i18n";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Container from "@/components/ui/container";
import logger from "@/lib/logger";
import { sqlClient } from "@/lib/prismadb";
import { transformPrismaDataForJson } from "@/utils/utils";
import { StoreSubscribeConfirmedRefresh } from "../../components/store-subscribe-confirmed-refresh";

/**
 * Stripe redirects here after PaymentElement confirmation for store Pro subscription.
 */
export default async function StoreSubscribeStripeConfirmedPage(props: {
	params: Promise<{ storeId: string }>;
	searchParams: Promise<{
		subscriptionPaymentId?: string;
		payment_intent?: string;
		payment_intent_client_secret?: string;
		redirect_status?: string;
	}>;
}) {
	const params = await props.params;
	const searchParams = await props.searchParams;
	const { t } = await getT();

	const subscriptionPaymentId =
		typeof searchParams.subscriptionPaymentId === "string"
			? searchParams.subscriptionPaymentId
			: undefined;

	if (!subscriptionPaymentId) {
		return (
			<Container>
				<Card className="mx-auto max-w-lg border-destructive/50">
					<CardHeader>
						<CardTitle>
							{t("store_admin_subscribe_confirm_invalid_title")}
						</CardTitle>
						<CardDescription>
							{t("store_admin_subscribe_confirm_invalid_description")}
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
			</Container>
		);
	}

	const raw = await sqlClient.subscriptionPayment.findUnique({
		where: { id: subscriptionPaymentId },
	});

	if (!raw || raw.storeId !== params.storeId) {
		notFound();
	}

	transformPrismaDataForJson(raw);
	const sp = raw as {
		isPaid: boolean;
		targetStoreLevel?: number | null;
	};

	if (sp.isPaid) {
		return (
			<Container>
				<SuccessCard
					storeId={params.storeId}
					targetLevel={sp.targetStoreLevel}
				/>
			</Container>
		);
	}

	if (searchParams.redirect_status === "failed") {
		return (
			<Container>
				<Card className="mx-auto max-w-lg border-destructive/50">
					<CardHeader>
						<CardTitle>
							{t("store_admin_subscribe_confirm_failed_title")}
						</CardTitle>
						<CardDescription>
							{t("store_admin_subscribe_confirm_failed_description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						<Button asChild variant="outline">
							<Link href={`/storeAdmin/${params.storeId}/subscribe`}>
								{t("store_admin_subscribe_try_again")}
							</Link>
						</Button>
						<Button asChild>
							<Link href={`/storeAdmin/${params.storeId}`}>
								{t("store_admin_subscribe_back_dashboard")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			</Container>
		);
	}

	if (
		searchParams.payment_intent &&
		searchParams.payment_intent_client_secret &&
		searchParams.redirect_status === "succeeded"
	) {
		try {
			const ok = await confirmSubscriptionPayment(
				subscriptionPaymentId,
				searchParams.payment_intent,
				searchParams.payment_intent_client_secret,
			);
			if (ok) {
				return (
					<Container>
						<SuccessCard
							storeId={params.storeId}
							targetLevel={sp.targetStoreLevel}
						/>
					</Container>
				);
			}
		} catch (err: unknown) {
			logger.error("Store subscription confirmation failed", {
				metadata: {
					error: err instanceof Error ? err.message : String(err),
					storeId: params.storeId,
					subscriptionPaymentId,
				},
				tags: ["payment", "stripe", "subscription", "error"],
			});
		}

		return (
			<Container>
				<Card className="mx-auto max-w-lg border-destructive/50">
					<CardHeader>
						<CardTitle>
							{t("store_admin_subscribe_confirm_failed_title")}
						</CardTitle>
						<CardDescription>
							{t("store_admin_subscribe_confirm_failed_description")}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-2">
						<Button asChild variant="outline">
							<Link href={`/storeAdmin/${params.storeId}/subscribe`}>
								{t("store_admin_subscribe_try_again")}
							</Link>
						</Button>
						<Button asChild>
							<Link href={`/storeAdmin/${params.storeId}`}>
								{t("store_admin_subscribe_back_dashboard")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			</Container>
		);
	}

	return (
		<Container>
			<div className="flex min-h-[40vh] items-center justify-center">
				<Loader />
			</div>
		</Container>
	);
}

async function SuccessCard({
	storeId,
	targetLevel,
}: {
	storeId: string;
	targetLevel?: number | null;
}) {
	const { t } = await getT();
	return (
		<>
			<StoreSubscribeConfirmedRefresh targetLevel={targetLevel} />
			<Card className="mx-auto max-w-lg border-green-300 dark:border-green-700">
				<CardHeader>
					<CardTitle>{t("subscription_success_title")}</CardTitle>
					<CardDescription>{t("subscription_success_descr")}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button asChild>
						<Link href={`/storeAdmin/${storeId}`}>
							{t("store_admin_subscribe_back_dashboard")}
						</Link>
					</Button>
				</CardContent>
			</Card>
		</>
	);
}

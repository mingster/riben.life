import { getT } from "@/app/i18n";
import { runCustomerRsvpConfirm } from "@/lib/reservation/customer-confirm-from-token";
import type { Metadata } from "next";
import Link from "next/link";

type Params = Promise<{ storeId: string }>;
type SearchParams = Promise<{ token?: string | string[] }>;

export const dynamic = "force-dynamic";

export async function generateMetadata({
	params,
}: {
	params: Params;
}): Promise<Metadata> {
	const { storeId } = await params;
	const { t } = await getT();
	return {
		title: t("rsvp_customer_confirm_title"),
		robots: { index: false, follow: false },
		alternates: { canonical: `/s/${storeId}/reservation/customer-confirm` },
	};
}

export default async function CustomerConfirmPage(props: {
	params: Params;
	searchParams: SearchParams;
}) {
	const { storeId } = await props.params;
	const sp = await props.searchParams;
	const token = typeof sp.token === "string" ? sp.token : undefined;

	const { t } = await getT();
	const result = await runCustomerRsvpConfirm({
		token,
		storeIdFromRoute: storeId,
	});

	let message: string;
	let tone: "ok" | "warn" | "err" = "ok";

	if (result.kind === "success") {
		message = t("rsvp_customer_confirm_success");
		tone = "ok";
	} else if (result.kind === "already") {
		message = t("rsvp_customer_confirm_already");
		tone = "ok";
	} else if (result.kind === "missing_token") {
		message = t("rsvp_customer_confirm_missing_token");
		tone = "err";
	} else if (result.kind === "wrong_store") {
		message = t("rsvp_customer_confirm_wrong_store");
		tone = "err";
	} else if (result.kind === "invalid_status") {
		message = t("rsvp_customer_confirm_invalid_status");
		tone = "warn";
	} else {
		message = t("rsvp_customer_confirm_invalid");
		tone = "err";
	}

	const bg =
		tone === "ok"
			? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
			: tone === "warn"
				? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
				: "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800";

	return (
		<div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-12">
			<div className={`rounded-xl border px-6 py-8 shadow-sm ${bg}`}>
				<h1 className="text-xl font-semibold tracking-tight">
					{t("rsvp_customer_confirm_title")}
				</h1>
				<p className="mt-4 text-muted-foreground whitespace-pre-wrap">
					{message}
				</p>
				<p className="mt-8">
					<Link
						href={`/s/${storeId}/reservation/history`}
						className="text-primary underline-offset-4 hover:underline"
					>
						{t("rsvp_history")}
					</Link>
				</p>
			</div>
		</div>
	);
}

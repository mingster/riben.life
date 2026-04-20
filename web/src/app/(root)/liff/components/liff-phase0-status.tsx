"use client";

import { useTranslation } from "@/app/i18n/client";
import { Loader } from "@/components/loader";
import { useI18n } from "@/providers/i18n-provider";
import { useLiff } from "@/providers/liff-provider";

interface LiffPhase0StatusProps {
	storeName?: string | null;
}

/** Diagnostics for LINE Developers / local smoke tests. */
export function LiffPhase0Status({ storeName }: LiffPhase0StatusProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const { ready, error, isInClient, isLoggedIn, profile } = useLiff();

	if (!ready) {
		return (
			<div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
				<Loader />
				<p className="text-sm text-muted-foreground">
					{t("liff_phase_0_loading")}
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
				<p className="text-sm font-medium text-destructive">
					{t("liff_phase_0_init_failed")}
				</p>
				<p className="mt-2 font-mono text-xs text-muted-foreground">{error}</p>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-lg space-y-4">
			{storeName ? (
				<h1 className="text-lg font-semibold sm:text-xl">
					{t("liff_phase_0_store_title", { name: storeName })}
				</h1>
			) : (
				<h1 className="text-lg font-semibold sm:text-xl">
					{t("liff_phase_0_bootstrap_title")}
				</h1>
			)}

			<ul className="space-y-2 text-sm text-muted-foreground">
				<li>
					<span className="font-medium text-foreground">
						{t("liff_phase_0_in_line_app")}:{" "}
					</span>
					{isInClient ? t("yes") : t("no")}
				</li>
				<li>
					<span className="font-medium text-foreground">
						{t("liff_phase_0_logged_in")}:{" "}
					</span>
					{isLoggedIn ? t("yes") : t("no")}
				</li>
				{profile?.lineUserId ? (
					<li className="break-all font-mono text-xs">
						<span className="font-medium text-foreground">
							{t("liff_phase_0_line_user_id")}:{" "}
						</span>
						{profile.lineUserId}
					</li>
				) : null}
				{profile?.displayName ? (
					<li>
						<span className="font-medium text-foreground">
							{t("liff_phase_0_display_name")}:{" "}
						</span>
						{profile.displayName}
					</li>
				) : null}
			</ul>

			<p className="text-xs font-mono text-gray-500">
				{t("liff_phase_0_auth_hint")}
			</p>
		</div>
	);
}

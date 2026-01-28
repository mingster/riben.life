"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslation } from "@/app/i18n/client";
import { useI18n } from "@/providers/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { IconBrandLine, IconX, IconInfoCircle } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { toastSuccess, toastError } from "@/components/toaster";

const DISMISSED_STORAGE_KEY = "line_add_friend_prompt_dismissed";
const DEFAULT_QR_CODE_PATH = "/line_bot_base_id_499jotij.png";

interface LineAddFriendPromptProps {
	/** Whether the user has signed in with LINE (has line_userId) */
	hasLineAccount: boolean;
	/** Whether the user has added the LINE Official Account as friend (from webhook) */
	hasAddedOfficialAccount?: boolean;
	/** Optional: Store's LINE Official Account ID or QR code URL */
	lineOfficialAccountId?: string | null;
	/** Optional: Store's LINE Official Account QR code image URL */
	lineQrCodeUrl?: string | null;
	/** Optional: Custom className */
	className?: string;
	/** Optional: Show as banner instead of dialog */
	variant?: "banner" | "dialog";
}

/**
 * Prompt component to guide users to add LINE Official Account as a friend
 * Shows after user signs in with LINE Login
 */
export function LineAddFriendPrompt({
	hasLineAccount,
	hasAddedOfficialAccount = false,
	lineOfficialAccountId,
	lineQrCodeUrl,
	className,
	variant = "banner",
}: LineAddFriendPromptProps) {
	const { lng } = useI18n();
	const { t } = useTranslation(lng);
	const [dismissed, setDismissed] = useState(false);
	const [open, setOpen] = useState(false);

	// Check localStorage on mount
	useEffect(() => {
		if (typeof window !== "undefined") {
			const isDismissed =
				localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
			setDismissed(isDismissed);
		}
	}, []);

	// Clear dismissed state if user has added the account (from webhook)
	useEffect(() => {
		if (hasAddedOfficialAccount && typeof window !== "undefined") {
			localStorage.removeItem(DISMISSED_STORAGE_KEY);
			setDismissed(false);
		}
	}, [hasAddedOfficialAccount]);

	// Handle dismiss - save to localStorage
	const handleDismiss = () => {
		setDismissed(true);
		if (typeof window !== "undefined") {
			localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
		}
	};

	// Only show if:
	// - User has LINE account
	// - User hasn't added Official Account
	// If hasAddedOfficialAccount is explicitly false, always show (ignore dismissed state)
	// If hasAddedOfficialAccount is undefined/null (unknown), respect dismissed state
	if (!hasLineAccount) {
		return null;
	}

	// If user has explicitly added the account, don't show
	if (hasAddedOfficialAccount === true) {
		return null;
	}

	// If we know the user hasn't added the account (false), always show
	if (hasAddedOfficialAccount === false) {
		// Always show - ignore dismissed state
	} else {
		// Unknown state - respect dismissed state
		if (dismissed) {
			return null;
		}
	}

	// Banner variant
	if (variant === "banner") {
		return (
			<Alert className={cn("border-[#06C755]/50 bg-[#06C755]/5", className)}>
				<IconBrandLine className="h-5 w-5 text-[#06C755]" />
				<AlertTitle className="flex items-center justify-between">
					<span>{t("line_add_friend_title")}</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={handleDismiss}
					>
						<IconX className="h-4 w-4" />
					</Button>
				</AlertTitle>
				<AlertDescription className="space-y-3">
					<p className="text-sm">{t("line_add_friend_description")}</p>
					<div className="flex flex-col sm:flex-row gap-2">
						<Dialog open={open} onOpenChange={setOpen}>
							<DialogTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="h-9 border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10"
								>
									<IconInfoCircle className="mr-2 h-4 w-4" />
									{t("line_add_friend_how_to")}
								</Button>
							</DialogTrigger>
							<DialogContent className="max-w-md">
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2">
										<IconBrandLine className="h-5 w-5 text-[#06C755]" />
										{t("line_add_friend_title")}
									</DialogTitle>
									<DialogDescription>
										{t("line_add_friend_dialog_description")}
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-4">
									<div className="flex flex-col items-center gap-3">
										<div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-border rounded-lg bg-white p-2 flex items-center justify-center">
											<Image
												src={lineQrCodeUrl || DEFAULT_QR_CODE_PATH}
												alt={t("line_qr_code")}
												width={224}
												height={224}
												className="object-contain"
												priority
											/>
										</div>
										<p className="text-sm text-muted-foreground text-center max-w-sm">
											{t("line_scan_qr_code")}
										</p>
									</div>
									{lineOfficialAccountId && (
										<div className="space-y-2">
											<p className="text-sm font-medium">
												{t("line_official_account_id")}:
											</p>
											<div className="flex items-center gap-2">
												<code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">
													{lineOfficialAccountId}
												</code>
												<Button
													variant="outline"
													size="sm"
													onClick={async () => {
														try {
															await navigator.clipboard.writeText(
																lineOfficialAccountId,
															);
															toastSuccess({
																description: t("line_id_copied"),
															});
														} catch (error) {
															toastError({
																description: t("line_id_copy_failed"),
															});
														}
													}}
												>
													{t("copy")}
												</Button>
											</div>
										</div>
									)}
									<div className="space-y-2">
										<p className="text-sm font-medium">
											{t("line_add_friend_steps_title")}:
										</p>
										<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
											<li>{t("line_add_friend_step_1")}</li>
											<li>{t("line_add_friend_step_2")}</li>
											<li>{t("line_add_friend_step_3")}</li>
										</ol>
									</div>
									<Alert>
										<IconInfoCircle className="h-4 w-4" />
										<AlertDescription className="text-xs">
											{t("line_add_friend_note")}
										</AlertDescription>
									</Alert>
								</div>
							</DialogContent>
						</Dialog>
					</div>
				</AlertDescription>
			</Alert>
		);
	}

	// Dialog variant (for modal popup)
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"border-[#06C755] text-[#06C755] hover:bg-[#06C755]/10",
						className,
					)}
				>
					<IconBrandLine className="mr-2 h-4 w-4" />
					{t("line_add_friend_title")}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<IconBrandLine className="h-5 w-5 text-[#06C755]" />
						{t("line_add_friend_title")}
					</DialogTitle>
					<DialogDescription>
						{t("line_add_friend_dialog_description")}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex flex-col items-center gap-3">
						<div className="relative w-48 h-48 sm:w-56 sm:h-56 border-2 border-border rounded-lg bg-white p-2 flex items-center justify-center">
							<Image
								src={lineQrCodeUrl || DEFAULT_QR_CODE_PATH}
								alt={t("line_qr_code")}
								width={224}
								height={224}
								className="object-contain"
								priority
							/>
						</div>
						<p className="text-sm text-muted-foreground text-center max-w-sm">
							{t("line_scan_qr_code")}
						</p>
					</div>
					{lineOfficialAccountId && (
						<div className="space-y-2">
							<p className="text-sm font-medium">
								{t("line_official_account_id")}:
							</p>
							<div className="flex items-center gap-2">
								<code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm">
									{lineOfficialAccountId}
								</code>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										navigator.clipboard.writeText(lineOfficialAccountId);
									}}
								>
									{t("copy")}
								</Button>
							</div>
						</div>
					)}
					<div className="space-y-2">
						<p className="text-sm font-medium">
							{t("line_add_friend_steps_title")}:
						</p>
						<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
							<li>{t("line_add_friend_step_1")}</li>
							<li>{t("line_add_friend_step_2")}</li>
							<li>{t("line_add_friend_step_3")}</li>
						</ol>
					</div>
					<Alert>
						<IconInfoCircle className="h-4 w-4" />
						<AlertDescription className="text-xs">
							{t("line_add_friend_note")}
						</AlertDescription>
					</Alert>
				</div>
			</DialogContent>
		</Dialog>
	);
}
